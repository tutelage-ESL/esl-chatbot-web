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
// Announcement edit/delete, comments on/off and class comments
// (announcements.access.ts has the rules):
//   edit text / delete      — the author or an admin
//   comments on/off         — tutors of the class and admins
//   comment                 — any member; students only while comments are on
//   edit a comment          — its author only
//   delete a comment        — its author, a tutor of the class, or an admin
//   archived class          — nothing new is written (409)
//   new comment             — notifies the announcement's author + earlier commenters
// ───────────────────────────────────────────────────────────────────────────

const createdUserIds: string[] = [];
const createdClassIds: string[] = [];
const track = (u: TestUser) => (createdUserIds.push(u.id), u);
const createStudent = async () => track(await createTestUser({ role: "STUDENT" }));
const createTutor = async () => track(await createTestUser({ role: "TUTOR" }));
const createAdmin = async () => track(await createTestUser({ role: "ADMIN" }));
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** A class with a tutor (author of one announcement) and a student. */
async function setup() {
  const tutor = await createTutor();
  const student = await createStudent();
  const cls = await prisma.class.create({
    data: {
      className: "Announcement Comments Class",
      classCode: generateClassCode(),
      createdById: tutor.id,
      users: { create: [{ userId: tutor.id, role: "TUTOR" }, { userId: student.id, role: "STUDENT" }] },
    },
    select: { id: true },
  });
  createdClassIds.push(cls.id);
  const res = await request(app)
    .post(`/api/v1/classes/${cls.id}/announcements`)
    .set(auth(tutor.token))
    .send({ content: "Quiz on Monday" });
  const base = `/api/v1/classes/${cls.id}/announcements/${res.body.data.id}`;
  return { tutor, student, classId: cls.id, announcementId: res.body.data.id as string, base };
}

const comment = (base: string, token: string, content: string) =>
  request(app).post(`${base}/comments`).set(auth(token)).send({ content });

afterAll(async () => {
  await prisma.class.deleteMany({ where: { id: { in: createdClassIds } } });
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

describe("announcement shape", () => {
  it("starts with comments on, no comments and no files", async () => {
    const { tutor, classId } = await setup();
    const res = await request(app).get(`/api/v1/classes/${classId}/announcements`).set(auth(tutor.token));
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ commentsEnabled: true, commentCount: 0, attachments: [], editedAt: null });
  });
});

describe("PATCH /classes/:id/announcements/:announcementId", () => {
  it("the author edits the text and it is marked edited", async () => {
    const { tutor, base } = await setup();
    const res = await request(app).patch(base).set(auth(tutor.token)).send({ content: "Quiz on Tuesday" });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe("Quiz on Tuesday");
    expect(res.body.data.editedAt).not.toBeNull();
  });

  it("a student can neither edit nor turn comments off", async () => {
    const { student, base } = await setup();
    expect((await request(app).patch(base).set(auth(student.token)).send({ content: "x" })).status).toBe(403);
    expect((await request(app).patch(base).set(auth(student.token)).send({ commentsEnabled: false })).status).toBe(403);
  });

  it("another tutor of the class can turn comments off but not edit the text", async () => {
    const { classId, base } = await setup();
    const coTutor = await createTutor();
    await prisma.classUser.create({ data: { classId, userId: coTutor.id, role: "TUTOR" } });
    expect((await request(app).patch(base).set(auth(coTutor.token)).send({ commentsEnabled: false })).status).toBe(200);
    expect((await request(app).patch(base).set(auth(coTutor.token)).send({ content: "x" })).status).toBe(403);
  });

  it("an admin can edit any announcement", async () => {
    const { base } = await setup();
    const admin = await createAdmin();
    expect((await request(app).patch(base).set(auth(admin.token)).send({ content: "Fixed typo" })).status).toBe(200);
  });

  it("422 when there is nothing to change", async () => {
    const { tutor, base } = await setup();
    expect((await request(app).patch(base).set(auth(tutor.token)).send({})).status).toBe(422);
  });
});

describe("class comments", () => {
  it("a student comments and the author is notified", async () => {
    const { tutor, student, base } = await setup();
    const res = await comment(base, student.token, "Which chapters?");
    expect(res.status).toBe(201);
    expect(res.body.data.author.classRole).toBe("STUDENT");
    // Notifications are sent after the response
    await Bun.sleep(300);
    const notes = await prisma.notification.count({ where: { userId: tutor.id, type: "ANNOUNCEMENT_COMMENT" } });
    expect(notes).toBe(1);
  });

  it("a reply notifies earlier commenters but never the one replying", async () => {
    const { tutor, student, base } = await setup();
    await comment(base, student.token, "Which chapters?");
    await comment(base, tutor.token, "Chapters 3 and 4.");
    await Bun.sleep(300);
    expect(await prisma.notification.count({ where: { userId: student.id, type: "ANNOUNCEMENT_COMMENT" } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: tutor.id, type: "ANNOUNCEMENT_COMMENT" } })).toBe(1);
  });

  it("while comments are off, students can't comment but tutors can", async () => {
    const { tutor, student, base } = await setup();
    await request(app).patch(base).set(auth(tutor.token)).send({ commentsEnabled: false });
    expect((await comment(base, student.token, "Hello?")).status).toBe(403);
    expect((await comment(base, tutor.token, "Reminder: bring a pen")).status).toBe(201);
  });

  it("only the author edits a comment", async () => {
    const { tutor, student, base } = await setup();
    const c = await comment(base, student.token, "Which chapters?");
    const url = `${base}/comments/${c.body.data.id}`;
    expect((await request(app).patch(url).set(auth(tutor.token)).send({ content: "x" })).status).toBe(403);
    const own = await request(app).patch(url).set(auth(student.token)).send({ content: "Which chapters, please?" });
    expect(own.status).toBe(200);
    expect(own.body.data.editedAt).not.toBeNull();
  });

  it("a tutor deletes a student's comment; a student can't delete the tutor's", async () => {
    const { tutor, student, base } = await setup();
    const s = await comment(base, student.token, "Which chapters?");
    const t = await comment(base, tutor.token, "Chapters 3 and 4.");
    expect((await request(app).delete(`${base}/comments/${t.body.data.id}`).set(auth(student.token))).status).toBe(403);
    expect((await request(app).delete(`${base}/comments/${s.body.data.id}`).set(auth(tutor.token))).status).toBe(200);
  });

  it("a non-member gets 404", async () => {
    const { base } = await setup();
    const outsider = await createStudent();
    expect((await request(app).get(`${base}/comments`).set(auth(outsider.token))).status).toBe(404);
  });
});

describe("delete and archived classes", () => {
  it("only the author (or an admin) deletes; comments go with it", async () => {
    const { tutor, student, base, announcementId } = await setup();
    await comment(base, student.token, "Which chapters?");
    expect((await request(app).delete(base).set(auth(student.token))).status).toBe(403);
    expect((await request(app).delete(base).set(auth(tutor.token))).status).toBe(200);
    expect(await prisma.announcementComment.count({ where: { announcementId } })).toBe(0);
  });

  it("an archived class takes no new announcements or comments", async () => {
    const { tutor, student, classId, base } = await setup();
    await prisma.class.update({ where: { id: classId }, data: { archived: true } });
    const post = await request(app).post(`/api/v1/classes/${classId}/announcements`).set(auth(tutor.token)).send({ content: "x" });
    expect(post.status).toBe(409);
    expect((await comment(base, student.token, "x")).status).toBe(409);
  });
});
