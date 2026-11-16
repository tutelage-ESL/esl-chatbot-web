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
// Announcements — mounted at /api/v1/classes/:id/announcements
//
// Access model (announcements.service.ts):
//   GET  — any class member (TUTOR or STUDENT) or ADMIN; non-member → 404
//   POST — TUTOR member of the class or ADMIN; STUDENT member → 403; non-member → 404
//   Posting also fires a CLASS_ANNOUNCEMENT notification to every STUDENT member.
//
// Created classes are deleted explicitly in afterAll (createdBy is SetNull, so
// deleting the creator does not cascade the class). Cascade removes ClassUser +
// Announcement rows.
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

/** Inserts a class with the given creator as its TUTOR member. */
async function makeClass(creatorUserId: string) {
  const cls = await prisma.class.create({
    data: {
      className: "Announcements Class",
      classCode: generateClassCode(),
      createdById: creatorUserId,
      users: { create: { userId: creatorUserId, role: "TUTOR" } },
    },
    select: { id: true },
  });
  createdClassIds.push(cls.id);
  return cls;
}

const addMember = (classId: string, userId: string, role: "STUDENT" | "TUTOR") =>
  prisma.classUser.create({ data: { classId, userId, role }, select: { id: true } });

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

afterAll(async () => {
  await prisma.class.deleteMany({ where: { id: { in: createdClassIds } } });
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/classes/:id/announcements — create", () => {
  it("201 — a tutor of the class posts an announcement", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(tutor.token))
      .send({ content: "Homework due Friday" });
    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe("Homework due Friday");
    expect(res.body.data.authorId).toBe(tutor.id);
    expect(res.body.data.author.id).toBe(tutor.id);
  });

  it("201 — posting notifies every STUDENT member with a CLASS_ANNOUNCEMENT", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");

    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(tutor.token))
      .send({ content: "Welcome to the class" });
    expect(res.status).toBe(201);

    const notes = await prisma.notification.findMany({
      where: { userId: student.id, type: "CLASS_ANNOUNCEMENT" },
    });
    expect(notes.length).toBe(1);
  });

  it("201 — an admin can post to any class without being a member", async () => {
    const tutor = await createTutor();
    const admin = await createAdmin();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(admin.token))
      .send({ content: "Platform notice" });
    expect(res.status).toBe(201);
  });

  it("403 — a student member cannot post", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(student.token))
      .send({ content: "I should not be able to post" });
    expect(res.status).toBe(403);
  });

  it("404 — a non-member tutor cannot post", async () => {
    const owner = await createTutor();
    const outsider = await createTutor();
    const cls = await makeClass(owner.id);
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(outsider.token))
      .send({ content: "Not my class" });
    expect(res.status).toBe(404);
  });

  it("422 — empty content", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(tutor.token))
      .send({ content: "" });
    expect(res.status).toBe(422);
  });

  it("422 — non-uuid class id", async () => {
    const tutor = await createTutor();
    const res = await request(app)
      .post(`/api/v1/classes/not-a-uuid/announcements`)
      .set(auth(tutor.token))
      .send({ content: "hi" });
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app)
      .post(`/api/v1/classes/${NONEXISTENT_ID}/announcements`)
      .send({ content: "hi" });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/classes/:id/announcements — list", () => {
  it("200 — a tutor lists announcements newest-first with pagination meta", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    await request(app)
      .post(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(tutor.token))
      .send({ content: "first" });
    await request(app)
      .post(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(tutor.token))
      .send({ content: "second" });

    const res = await request(app)
      .get(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(tutor.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].content).toBe("second"); // newest first
    expect(res.body.meta.total).toBe(2);
  });

  it("200 — a student member can read announcements", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const cls = await makeClass(tutor.id);
    await addMember(cls.id, student.id, "STUDENT");
    await request(app)
      .post(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(tutor.token))
      .send({ content: "for students" });

    const res = await request(app)
      .get(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(student.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("200 — an admin can read any class's announcements", async () => {
    const tutor = await createTutor();
    const admin = await createAdmin();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .get(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(admin.token));
    expect(res.status).toBe(200);
  });

  it("404 — a non-member cannot list", async () => {
    const tutor = await createTutor();
    const outsider = await createStudent();
    const cls = await makeClass(tutor.id);
    const res = await request(app)
      .get(`/api/v1/classes/${cls.id}/announcements`)
      .set(auth(outsider.token));
    expect(res.status).toBe(404);
  });

  it("401 — no token", async () => {
    const res = await request(app).get(`/api/v1/classes/${NONEXISTENT_ID}/announcements`);
    expect(res.status).toBe(401);
  });
});
