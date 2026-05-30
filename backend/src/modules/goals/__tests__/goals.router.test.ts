import { describe, it, expect, afterAll } from "bun:test";
import {
  app,
  request,
  prisma,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../../test/helpers.ts";
import { generateClassCode } from "../../classes/classCode.util.ts";

// ───────────────────────────────────────────────────────────────────────────
// Phase 5b — Goals (self-set + tutor-assigned, COMPLETED auto-fields, authz)
//
// Access (assertCanAccess): ADMIN always; owner (goal.userId) or the assigning
// tutor (goal.assignedByTutorId) otherwise; else 403.
// Tutor assigning / viewing a student requires the student to be a STUDENT in
// one of the tutor's classes, else 404.
// ───────────────────────────────────────────────────────────────────────────

const NONEXISTENT_ID = "00000000-0000-4000-8000-000000000000";
const createdUserIds: string[] = [];
const createdClassIds: string[] = [];

const track = (u: TestUser) => (createdUserIds.push(u.id), u);
const createStudent = async () => track(await createTestUser({ role: "STUDENT" }));
const createTutor = async () => track(await createTestUser({ role: "TUTOR" }));
const createAdmin = async () => track(await createTestUser({ role: "ADMIN" }));
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

/** Creates a class with the tutor as TUTOR and the student as STUDENT member. */
async function classWith(tutorId: string, studentId: string) {
  const cls = await prisma.class.create({
    data: {
      className: "Goals Class",
      classCode: generateClassCode(),
      createdById: tutorId,
      users: {
        create: [
          { userId: tutorId, role: "TUTOR" },
          { userId: studentId, role: "STUDENT" },
        ],
      },
    },
    select: { id: true },
  });
  createdClassIds.push(cls.id);
  return cls;
}

const makeGoal = (userId: string, assignedByTutorId?: string) =>
  prisma.goal.create({
    data: {
      userId,
      assignedByTutorId: assignedByTutorId ?? null,
      type: "VOCABULARY",
      description: "Learn 50 new words",
      target: 50,
    },
    select: { id: true, status: true },
  });

afterAll(async () => {
  await prisma.class.deleteMany({ where: { id: { in: createdClassIds } } });
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/goals — create", () => {
  it("201 — a student creates a goal for themselves", async () => {
    const s = await createStudent();
    const res = await request(app)
      .post("/api/v1/goals")
      .set(auth(s.token))
      .send({ type: "VOCABULARY", description: "Learn 100 words", target: 100 });
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(s.id);
    expect(res.body.data.assignedByTutorId).toBeNull();
  });

  it("201 — a tutor assigns a goal to a student in their class", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    await classWith(tutor.id, student.id);
    const res = await request(app)
      .post("/api/v1/goals")
      .set(auth(tutor.token))
      .send({ assignedToUserId: student.id, type: "SPEAKING", description: "Practice daily", target: 7 });
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(student.id);
    expect(res.body.data.assignedByTutorId).toBe(tutor.id);
  });

  it("403 — a student cannot assign a goal to someone else", async () => {
    const s = await createStudent();
    const other = await createStudent();
    const res = await request(app)
      .post("/api/v1/goals")
      .set(auth(s.token))
      .send({ assignedToUserId: other.id, type: "GRAMMAR", description: "x", target: 1 });
    expect(res.status).toBe(403);
  });

  it("404 — a tutor cannot assign to a student not in their class", async () => {
    const tutor = await createTutor();
    const stranger = await createStudent();
    const res = await request(app)
      .post("/api/v1/goals")
      .set(auth(tutor.token))
      .send({ assignedToUserId: stranger.id, type: "GRAMMAR", description: "x", target: 1 });
    expect(res.status).toBe(404);
  });

  it("422 — invalid type", async () => {
    const s = await createStudent();
    const res = await request(app)
      .post("/api/v1/goals")
      .set(auth(s.token))
      .send({ type: "DANCING", description: "x", target: 1 });
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app)
      .post("/api/v1/goals")
      .send({ type: "VOCABULARY", description: "x", target: 1 });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/goals — list", () => {
  it("200 — a student lists their own goals, filterable by status", async () => {
    const s = await createStudent();
    await makeGoal(s.id);
    const res = await request(app).get("/api/v1/goals?status=ACTIVE").set(auth(s.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((g: { status: string }) => g.status === "ACTIVE")).toBe(true);
  });

  it("403 — a student cannot use ?studentId= to view another user", async () => {
    const s = await createStudent();
    const other = await createStudent();
    const res = await request(app)
      .get(`/api/v1/goals?studentId=${other.id}`)
      .set(auth(s.token));
    expect(res.status).toBe(403);
  });

  it("200 — a tutor views ?studentId= for a student in their class", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    await classWith(tutor.id, student.id);
    await makeGoal(student.id);
    const res = await request(app)
      .get(`/api/v1/goals?studentId=${student.id}`)
      .set(auth(tutor.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("404 — a tutor cannot view ?studentId= for a non-class student", async () => {
    const tutor = await createTutor();
    const stranger = await createStudent();
    const res = await request(app)
      .get(`/api/v1/goals?studentId=${stranger.id}`)
      .set(auth(tutor.token));
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/goals/:id", () => {
  it("200 — owner reads their goal", async () => {
    const s = await createStudent();
    const g = await makeGoal(s.id);
    const res = await request(app).get(`/api/v1/goals/${g.id}`).set(auth(s.token));
    expect(res.status).toBe(200);
  });

  it("403 — another student cannot read it", async () => {
    const owner = await createStudent();
    const other = await createStudent();
    const g = await makeGoal(owner.id);
    const res = await request(app).get(`/api/v1/goals/${g.id}`).set(auth(other.token));
    expect(res.status).toBe(403);
  });

  it("200 — an admin can read any goal", async () => {
    const owner = await createStudent();
    const admin = await createAdmin();
    const g = await makeGoal(owner.id);
    const res = await request(app).get(`/api/v1/goals/${g.id}`).set(auth(admin.token));
    expect(res.status).toBe(200);
  });

  it("404 — nonexistent goal", async () => {
    const s = await createStudent();
    const res = await request(app).get(`/api/v1/goals/${NONEXISTENT_ID}`).set(auth(s.token));
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("PATCH /api/v1/goals/:id", () => {
  it("200 — update description", async () => {
    const s = await createStudent();
    const g = await makeGoal(s.id);
    const res = await request(app)
      .patch(`/api/v1/goals/${g.id}`)
      .set(auth(s.token))
      .send({ description: "Revised goal" });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe("Revised goal");
  });

  it("200 — status COMPLETED auto-sets completedDate and progress=100", async () => {
    const s = await createStudent();
    const g = await makeGoal(s.id);
    const res = await request(app)
      .patch(`/api/v1/goals/${g.id}`)
      .set(auth(s.token))
      .send({ status: "COMPLETED" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("COMPLETED");
    expect(res.body.data.progress).toBe(100);
    expect(res.body.data.completedDate).not.toBeNull();
  });

  it("200 — setting progress records lastProgressUpdate", async () => {
    const s = await createStudent();
    const g = await makeGoal(s.id);
    const res = await request(app)
      .patch(`/api/v1/goals/${g.id}`)
      .set(auth(s.token))
      .send({ progress: 40 });
    expect(res.status).toBe(200);
    expect(res.body.data.progress).toBe(40);
    expect(res.body.data.lastProgressUpdate).not.toBeNull();
  });

  it("403 — a non-owner cannot update", async () => {
    const owner = await createStudent();
    const other = await createStudent();
    const g = await makeGoal(owner.id);
    const res = await request(app)
      .patch(`/api/v1/goals/${g.id}`)
      .set(auth(other.token))
      .send({ description: "hijack" });
    expect(res.status).toBe(403);
  });

  it("422 — empty body", async () => {
    const s = await createStudent();
    const g = await makeGoal(s.id);
    const res = await request(app).patch(`/api/v1/goals/${g.id}`).set(auth(s.token)).send({});
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("DELETE /api/v1/goals/:id", () => {
  it("200 — owner deletes their goal", async () => {
    const s = await createStudent();
    const g = await makeGoal(s.id);
    const res = await request(app).delete(`/api/v1/goals/${g.id}`).set(auth(s.token));
    expect(res.status).toBe(200);
    expect(await prisma.goal.findUnique({ where: { id: g.id } })).toBeNull();
  });

  it("200 — the assigning tutor can delete a goal they assigned", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    await classWith(tutor.id, student.id);
    const g = await makeGoal(student.id, tutor.id);
    const res = await request(app).delete(`/api/v1/goals/${g.id}`).set(auth(tutor.token));
    expect(res.status).toBe(200);
  });

  it("403 — an unrelated user cannot delete", async () => {
    const owner = await createStudent();
    const other = await createStudent();
    const g = await makeGoal(owner.id);
    const res = await request(app).delete(`/api/v1/goals/${g.id}`).set(auth(other.token));
    expect(res.status).toBe(403);
  });
});
