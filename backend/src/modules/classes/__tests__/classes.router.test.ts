import { describe, it, expect, afterAll } from "bun:test";
import {
  app,
  request,
  prisma,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../../test/helpers.ts";
import { generateClassCode } from "../classCode.util.ts";

// ───────────────────────────────────────────────────────────────────────────
// Phase 4 — Classes (code lifecycle, join flow, authz, member removal)
//
// Authorization has TWO layers on the code-management routes:
//   1. Route guard authorize("TUTOR","ADMIN") — checks the JWT's GLOBAL role.
//   2. Service assertTutorOfClass — checks CLASS MEMBERSHIP role.
// So a STUDENT-role user → 403 at the route; a TUTOR-role non-member → 404 from
// the service; a TUTOR-role user who is only a STUDENT member → 403 from the service.
//
// Class.createdBy is SetNull, so deleting the creator does NOT remove the class —
// created classes are tracked and deleted explicitly in afterAll (cascade removes
// ClassUser rows). User cleanup cascades everything a user owns.
// ───────────────────────────────────────────────────────────────────────────

const NONEXISTENT_ID = "00000000-0000-4000-8000-000000000000";
const createdUserIds: string[] = [];
const createdClassIds: string[] = [];

function track(u: TestUser): TestUser {
  createdUserIds.push(u.id);
  return u;
}
const createStudent = async () => track(await createTestUser({ role: "STUDENT" }));
const createTutor = async () => track(await createTestUser({ role: "TUTOR" }));
const createAdmin = async () => track(await createTestUser({ role: "ADMIN" }));

interface MakeClassOpts {
  status?: "ACTIVE" | "INACTIVE";
  blocked?: boolean;
  expiresAt?: Date | null;
  refreshInterval?: number | null;
}

/** Inserts a class with the given creator as its TUTOR member. */
async function makeClass(creatorUserId: string, opts: MakeClassOpts = {}) {
  const cls = await prisma.class.create({
    data: {
      className: "Test Class",
      classCode: generateClassCode(),
      classStatus: opts.status ?? "ACTIVE",
      classCodeBlocked: opts.blocked ?? false,
      classCodeExpiresAt: opts.expiresAt ?? null,
      classCodeRefreshIntervalSeconds: opts.refreshInterval ?? null,
      createdById: creatorUserId,
      users: { create: { userId: creatorUserId, role: "TUTOR" } },
    },
    select: { id: true, classCode: true },
  });
  createdClassIds.push(cls.id);
  return cls;
}

const addMember = (classId: string, userId: string, role: "STUDENT" | "TUTOR") =>
  prisma.classUser.create({ data: { classId, userId, role }, select: { id: true } });

const codeOf = async (classId: string) =>
  (await prisma.class.findUnique({ where: { id: classId }, select: { classCode: true } }))?.classCode;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

afterAll(async () => {
  await prisma.class.deleteMany({ where: { id: { in: createdClassIds } } });
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/classes — create", () => {
  it("201 — a tutor creates a class and is added as a TUTOR member", async () => {
    const tutor = await createTutor();
    const res = await request(app)
      .post("/api/v1/classes")
      .set(auth(tutor.token))
      .send({ className: "Algebra 101" });

    expect(res.status).toBe(201);
    expect(res.body.data.className).toBe("Algebra 101");
    expect(typeof res.body.data.classCode).toBe("string");
    createdClassIds.push(res.body.data.id);

    const me = res.body.data.members.find((m: { user: { id: string } }) => m.user.id === tutor.id);
    expect(me.role).toBe("TUTOR");
  });

  it("403 — a student (global role) cannot create a class", async () => {
    const student = await createStudent();
    const res = await request(app)
      .post("/api/v1/classes")
      .set(auth(student.token))
      .send({ className: "Nope" });
    expect(res.status).toBe(403);
  });

  it("401 — no token", async () => {
    const res = await request(app).post("/api/v1/classes").send({ className: "X" });
    expect(res.status).toBe(401);
  });

  it("422 — missing className", async () => {
    const tutor = await createTutor();
    const res = await request(app).post("/api/v1/classes").set(auth(tutor.token)).send({});
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/classes/join", () => {
  it("201 — joins by code as a STUDENT", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);

    const res = await request(app)
      .post("/api/v1/classes/join")
      .set(auth(student.token))
      .send({ classCode: cls.classCode });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("STUDENT");
    expect(res.body.data.classId).toBe(cls.id);
  });

  it("201 — codes are case-insensitive", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .post("/api/v1/classes/join")
      .set(auth(student.token))
      .send({ classCode: cls.classCode.toLowerCase() });
    expect(res.status).toBe(201);
  });

  it("404 — unknown code", async () => {
    const student = await createStudent();
    const res = await request(app)
      .post("/api/v1/classes/join")
      .set(auth(student.token))
      .send({ classCode: "ZZZZZZZZ" });
    expect(res.status).toBe(404);
  });

  it("403 — blocked code", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id, { blocked: true });
    const res = await request(app)
      .post("/api/v1/classes/join")
      .set(auth(student.token))
      .send({ classCode: cls.classCode });
    expect(res.status).toBe(403);
  });

  it("409 — class is INACTIVE", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id, { status: "INACTIVE" });
    const res = await request(app)
      .post("/api/v1/classes/join")
      .set(auth(student.token))
      .send({ classCode: cls.classCode });
    expect(res.status).toBe(409);
  });

  it("409 — already a member", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");
    const res = await request(app)
      .post("/api/v1/classes/join")
      .set(auth(student.token))
      .send({ classCode: cls.classCode });
    expect(res.status).toBe(409);
  });

  it("410 — expired code is rejected AND rotated to a new value", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id, { expiresAt: new Date(Date.now() - 1000) });
    const original = cls.classCode;

    const res = await request(app)
      .post("/api/v1/classes/join")
      .set(auth(student.token))
      .send({ classCode: original });

    expect(res.status).toBe(410);
    // The expired code was lazily rotated internally — the stored code changed.
    expect(await codeOf(cls.id)).not.toBe(original);
  });

  it("422 — missing classCode", async () => {
    const student = await createStudent();
    const res = await request(app).post("/api/v1/classes/join").set(auth(student.token)).send({});
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/classes/:id — detail", () => {
  it("200 — a member can read the class", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");

    const res = await request(app).get(`/api/v1/classes/${cls.id}`).set(auth(student.token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(cls.id);
  });

  it("200 — an admin can read any class", async () => {
    const tutor = await createTutor();
    const admin = await createAdmin();
    const cls = await makeClass(tutor.id);
    const res = await request(app).get(`/api/v1/classes/${cls.id}`).set(auth(admin.token));
    expect(res.status).toBe(200);
  });

  it("404 — a non-member cannot read the class (existence not revealed)", async () => {
    const tutor = await createTutor();
    const outsider = await createStudent();
    const cls = await makeClass(tutor.id);
    const res = await request(app).get(`/api/v1/classes/${cls.id}`).set(auth(outsider.token));
    expect(res.status).toBe(404);
  });

  it("422 — invalid (non-uuid) class id", async () => {
    const user = await createStudent();
    const res = await request(app).get(`/api/v1/classes/not-a-uuid`).set(auth(user.token));
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const res = await request(app).get(`/api/v1/classes/${cls.id}`);
    expect(res.status).toBe(401);
  });

  it("refresh-on-read — a tutor opening a class with an expired code gets a fresh code", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id, { expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).get(`/api/v1/classes/${cls.id}`).set(auth(tutor.token));
    expect(res.status).toBe(200);
    expect(res.body.data.classCode).not.toBe(cls.classCode);
  });

  it("refresh-on-read — a student opening an expired class does NOT rotate the code", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id, { expiresAt: new Date(Date.now() - 1000) });
    await addMember(cls.id, student.id, "STUDENT");
    const res = await request(app).get(`/api/v1/classes/${cls.id}`).set(auth(student.token));
    expect(res.status).toBe(200);
    expect(res.body.data.classCode).toBe(cls.classCode);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/classes/mine", () => {
  it("200 — lists the caller's memberships with their per-class role", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");

    const res = await request(app).get("/api/v1/classes/mine").set(auth(student.token));
    expect(res.status).toBe(200);
    const mine = res.body.data.find((c: { id: string }) => c.id === cls.id);
    expect(mine.myRole).toBe("STUDENT");
  });

  it("refresh-on-read — a tutor's expired code is rotated when listing", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id, { expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).get("/api/v1/classes/mine").set(auth(tutor.token));
    expect(res.status).toBe(200);
    const mine = res.body.data.find((c: { id: string }) => c.id === cls.id);
    expect(mine.classCode).not.toBe(cls.classCode);
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/classes/mine");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/classes/:id/code/refresh", () => {
  it("200 — a tutor of the class rotates the code", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/code/refresh`)
      .set(auth(tutor.token));
    expect(res.status).toBe(200);
    expect(res.body.data.classCode).not.toBe(cls.classCode);
  });

  it("200 — an admin can rotate any class's code", async () => {
    const tutor = await createTutor();
    const admin = await createAdmin();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/code/refresh`)
      .set(auth(admin.token));
    expect(res.status).toBe(200);
  });

  it("403 — a STUDENT global role is blocked at the route guard", async () => {
    const student = await createStudent();
    const cls = await makeClass((await createTutor()).id);
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/code/refresh`)
      .set(auth(student.token));
    expect(res.status).toBe(403);
  });

  it("403 — a TUTOR-role user who is only a STUDENT member of the class", async () => {
    const owner = await createTutor();
    const tutorButStudent = await createTutor();
    const cls = await makeClass(owner.id);
    await addMember(cls.id, tutorButStudent.id, "STUDENT");
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/code/refresh`)
      .set(auth(tutorButStudent.token));
    expect(res.status).toBe(403);
  });

  it("404 — a TUTOR-role user who is not a member of the class", async () => {
    const owner = await createTutor();
    const stranger = await createTutor();
    const cls = await makeClass(owner.id);
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/code/refresh`)
      .set(auth(stranger.token));
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("PATCH /api/v1/classes/:id/code/block", () => {
  it("200 — blocking the code makes new joins fail with 403, unblocking restores them", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);

    const block = await request(app)
      .patch(`/api/v1/classes/${cls.id}/code/block`)
      .set(auth(tutor.token))
      .send({ blocked: true });
    expect(block.status).toBe(200);
    expect(block.body.data.classCodeBlocked).toBe(true);

    const blockedJoin = await request(app)
      .post("/api/v1/classes/join")
      .set(auth((await createStudent()).token))
      .send({ classCode: cls.classCode });
    expect(blockedJoin.status).toBe(403);

    const unblock = await request(app)
      .patch(`/api/v1/classes/${cls.id}/code/block`)
      .set(auth(tutor.token))
      .send({ blocked: false });
    expect(unblock.status).toBe(200);

    const okJoin = await request(app)
      .post("/api/v1/classes/join")
      .set(auth((await createStudent()).token))
      .send({ classCode: cls.classCode });
    expect(okJoin.status).toBe(201);
  });

  it("422 — blocked must be a boolean", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .patch(`/api/v1/classes/${cls.id}/code/block`)
      .set(auth(tutor.token))
      .send({ blocked: "yes" });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("PATCH /api/v1/classes/:id/code/settings", () => {
  it("200 — setting an interval recomputes expiry; null makes the code permanent", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id, { refreshInterval: null, expiresAt: null });

    const set = await request(app)
      .patch(`/api/v1/classes/${cls.id}/code/settings`)
      .set(auth(tutor.token))
      .send({ classCodeRefreshIntervalSeconds: 3600 });
    expect(set.status).toBe(200);
    expect(set.body.data.classCodeRefreshIntervalSeconds).toBe(3600);
    expect(set.body.data.classCodeExpiresAt).not.toBeNull();

    const perm = await request(app)
      .patch(`/api/v1/classes/${cls.id}/code/settings`)
      .set(auth(tutor.token))
      .send({ classCodeRefreshIntervalSeconds: null });
    expect(perm.status).toBe(200);
    expect(perm.body.data.classCodeExpiresAt).toBeNull();
  });

  it("422 — interval below the 60s minimum", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .patch(`/api/v1/classes/${cls.id}/code/settings`)
      .set(auth(tutor.token))
      .send({ classCodeRefreshIntervalSeconds: 5 });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("PATCH /api/v1/classes/:id — update", () => {
  it("200 — a tutor updates the class name and status", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .patch(`/api/v1/classes/${cls.id}`)
      .set(auth(tutor.token))
      .send({ className: "Renamed", classStatus: "INACTIVE" });
    expect(res.status).toBe(200);
    expect(res.body.data.className).toBe("Renamed");
    expect(res.body.data.classStatus).toBe("INACTIVE");
  });

  it("422 — empty body (at least one field required)", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .patch(`/api/v1/classes/${cls.id}`)
      .set(auth(tutor.token))
      .send({});
    expect(res.status).toBe(422);
  });

  it("404 — a TUTOR-role non-member cannot update the class", async () => {
    const owner = await createTutor();
    const stranger = await createTutor();
    const cls = await makeClass(owner.id);
    const res = await request(app)
      .patch(`/api/v1/classes/${cls.id}`)
      .set(auth(stranger.token))
      .send({ className: "Hijack" });
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("DELETE /api/v1/classes/:id/members/:userId — remove member", () => {
  it("200 — a student can leave the class (self-leave)", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");

    const res = await request(app)
      .delete(`/api/v1/classes/${cls.id}/members/${student.id}`)
      .set(auth(student.token));
    expect(res.status).toBe(200);

    const gone = await prisma.classUser.findUnique({
      where: { classId_userId: { classId: cls.id, userId: student.id } },
    });
    expect(gone).toBeNull();
  });

  it("200 — a tutor removes a student member", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");
    const res = await request(app)
      .delete(`/api/v1/classes/${cls.id}/members/${student.id}`)
      .set(auth(tutor.token));
    expect(res.status).toBe(200);
  });

  it("403 — a tutor cannot remove another tutor", async () => {
    const tutorA = await createTutor();
    const tutorB = await createTutor();
    const cls = await makeClass(tutorA.id);
    await addMember(cls.id, tutorB.id, "TUTOR");
    const res = await request(app)
      .delete(`/api/v1/classes/${cls.id}/members/${tutorB.id}`)
      .set(auth(tutorA.token));
    expect(res.status).toBe(403);
  });

  it("409 — the last tutor cannot leave", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .delete(`/api/v1/classes/${cls.id}/members/${tutor.id}`)
      .set(auth(tutor.token));
    expect(res.status).toBe(409);
  });

  it("200 — an admin can remove a tutor when another tutor remains", async () => {
    const tutorA = await createTutor();
    const tutorB = await createTutor();
    const admin = await createAdmin();
    const cls = await makeClass(tutorA.id);
    await addMember(cls.id, tutorB.id, "TUTOR");
    const res = await request(app)
      .delete(`/api/v1/classes/${cls.id}/members/${tutorA.id}`)
      .set(auth(admin.token));
    expect(res.status).toBe(200);
  });

  it("404 — removing a user who is not a member", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .delete(`/api/v1/classes/${cls.id}/members/${NONEXISTENT_ID}`)
      .set(auth(tutor.token));
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("Student monitoring & analytics (tutor / admin)", () => {
  it("GET /:id/students — 200 for a tutor of the class, listing student members", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");

    const res = await request(app).get(`/api/v1/classes/${cls.id}/students`).set(auth(tutor.token));
    expect(res.status).toBe(200);
    expect(res.body.data.some((s: { userId: string }) => s.userId === student.id)).toBe(true);
  });

  it("GET /:id/students — 403 for a student member", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");
    const res = await request(app)
      .get(`/api/v1/classes/${cls.id}/students`)
      .set(auth(student.token));
    expect(res.status).toBe(403);
  });

  it("GET /:id/students — 404 for a non-member", async () => {
    const tutor = await createTutor();
    const outsider = await createStudent();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .get(`/api/v1/classes/${cls.id}/students`)
      .set(auth(outsider.token));
    expect(res.status).toBe(404);
  });

  it("GET /:id/students/:userId — 200 for a student, 400 when the target is a tutor", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");

    const ok = await request(app)
      .get(`/api/v1/classes/${cls.id}/students/${student.id}`)
      .set(auth(tutor.token));
    expect(ok.status).toBe(200);
    expect(ok.body.data.userId).toBe(student.id);

    const notStudent = await request(app)
      .get(`/api/v1/classes/${cls.id}/students/${tutor.id}`)
      .set(auth(tutor.token));
    expect(notStudent.status).toBe(400);
  });

  it("GET /:id/analytics — 200 for a tutor, 403 for a student member", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");

    const tutorRes = await request(app)
      .get(`/api/v1/classes/${cls.id}/analytics`)
      .set(auth(tutor.token));
    expect(tutorRes.status).toBe(200);
    expect(tutorRes.body.data.studentCount).toBe(1);

    const studentRes = await request(app)
      .get(`/api/v1/classes/${cls.id}/analytics`)
      .set(auth(student.token));
    expect(studentRes.status).toBe(403);
  });
});
