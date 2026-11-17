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
// Tasks — mounted at /api/v1/classes/:id/tasks and /api/v1/tasks
//
// Access model (tasks.service.ts):
//   list/get        — any class member or ADMIN; non-member → 404 (existence hidden)
//   create/update/delete, list submissions, feedback
//                   — TUTOR member or ADMIN; STUDENT member → 403; non-member → 404
//   submit          — STUDENT members only (tutor/admin → 403); one submission per
//                     student (409); CLOSED task → 409
//   Creating notifies STUDENT members (TASK_ASSIGNED); submitting notifies TUTORs
//   (TASK_SUBMITTED). Internal (stealth) accounts are never notified.
//
// Classes are deleted explicitly in afterAll (createdBy is SetNull); cascade removes
// ClassUser, Task and TaskSubmission rows.
// ───────────────────────────────────────────────────────────────────────────

const NONEXISTENT_ID = "00000000-0000-4000-8000-000000000000";
const createdUserIds: string[] = [];
const createdClassIds: string[] = [];

function track(u: TestUser): TestUser {
  createdUserIds.push(u.id);
  return u;
}
const createStudent = async (opts: { isInternal?: boolean } = {}) => track(await createTestUser({ role: "STUDENT", ...opts }));
const createTutor = async () => track(await createTestUser({ role: "TUTOR" }));
const createAdmin = async () => track(await createTestUser({ role: "ADMIN" }));

async function makeClass(tutorId: string, opts: { archived?: boolean } = {}) {
  const cls = await prisma.class.create({
    data: {
      className: "Tasks Class",
      classCode: generateClassCode(),
      createdById: tutorId,
      archived: opts.archived ?? false,
      users: { create: { userId: tutorId, role: "TUTOR" } },
    },
    select: { id: true },
  });
  createdClassIds.push(cls.id);
  return cls;
}

const addMember = (classId: string, userId: string, role: "STUDENT" | "TUTOR") =>
  prisma.classUser.create({ data: { classId, userId, role }, select: { id: true } });

const makeTask = (classId: string, createdById: string, status: "OPEN" | "CLOSED" = "OPEN") =>
  prisma.task.create({
    data: { classId, createdById, title: "Write a paragraph", description: "About your weekend.", status },
    select: { id: true },
  });

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** A class with a tutor, a student member and an outsider student. */
async function scenario() {
  const tutor = await createTutor();
  const student = await createStudent();
  const outsider = await createStudent();
  const cls = await makeClass(tutor.id);
  await addMember(cls.id, student.id, "STUDENT");
  return { tutor, student, outsider, cls };
}

afterAll(async () => {
  await prisma.class.deleteMany({ where: { id: { in: createdClassIds } } });
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/classes/:id/tasks — create", () => {
  it("401 — no token", async () => {
    const res = await request(app).post(`/api/v1/classes/${NONEXISTENT_ID}/tasks`).send({ title: "t", description: "d" });
    expect(res.status).toBe(401);
  });

  it("201 — a tutor of the class creates an OPEN task", async () => {
    const { tutor, cls } = await scenario();
    const deadline = new Date(Date.now() + 86_400_000).toISOString();
    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/tasks`)
      .set(auth(tutor.token))
      .send({ title: "Essay", description: "Write 150 words.", deadline });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ classId: cls.id, title: "Essay", status: "OPEN", closedAt: null });
    expect(new Date(res.body.data.deadline).toISOString()).toBe(deadline);
  });

  it("201 — notifies student members but not internal accounts", async () => {
    const { tutor, student, cls } = await scenario();
    const stealth = await createStudent({ isInternal: true });
    await addMember(cls.id, stealth.id, "STUDENT");

    const res = await request(app)
      .post(`/api/v1/classes/${cls.id}/tasks`)
      .set(auth(tutor.token))
      .send({ title: "Quiz", description: "Answer the questions." });
    expect(res.status).toBe(201);

    const notes = await prisma.notification.findMany({
      where: { type: "TASK_ASSIGNED", userId: { in: [student.id, stealth.id, tutor.id] } },
      select: { userId: true, data: true },
    });
    expect(notes.map((n) => n.userId)).toEqual([student.id]);
    expect(notes[0]!.data).toMatchObject({ classId: cls.id, taskId: res.body.data.id });
  });

  it("201 — an ADMIN can create a task in any class", async () => {
    const { cls } = await scenario();
    const admin = await createAdmin();
    const res = await request(app).post(`/api/v1/classes/${cls.id}/tasks`).set(auth(admin.token)).send({ title: "T", description: "D" });
    expect(res.status).toBe(201);
  });

  it("403 — a student member cannot create tasks", async () => {
    const { student, cls } = await scenario();
    const res = await request(app).post(`/api/v1/classes/${cls.id}/tasks`).set(auth(student.token)).send({ title: "T", description: "D" });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("404 — a tutor who does not belong to the class", async () => {
    const { cls } = await scenario();
    const otherTutor = await createTutor();
    const res = await request(app).post(`/api/v1/classes/${cls.id}/tasks`).set(auth(otherTutor.token)).send({ title: "T", description: "D" });
    expect(res.status).toBe(404);
  });

  it("409 — cannot add tasks to an archived class", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id, { archived: true });
    const res = await request(app).post(`/api/v1/classes/${cls.id}/tasks`).set(auth(tutor.token)).send({ title: "T", description: "D" });
    expect(res.status).toBe(409);
  });

  it.each([
    [{ description: "D" }, "missing title"],
    [{ title: "T" }, "missing description"],
    [{ title: "x".repeat(201), description: "D" }, "title over 200 chars"],
    [{ title: "T", description: "D", deadline: "next friday" }, "non-ISO deadline"],
  ])("422 — %#: %s", async (body) => {
    const { tutor, cls } = await scenario();
    const res = await request(app).post(`/api/v1/classes/${cls.id}/tasks`).set(auth(tutor.token)).send(body);
    expect(res.status).toBe(422);
  });

  it("422 — malformed class id", async () => {
    const tutor = await createTutor();
    const res = await request(app).post("/api/v1/classes/not-a-uuid/tasks").set(auth(tutor.token)).send({ title: "T", description: "D" });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/classes/:id/tasks — list", () => {
  it("200 — students get their own submission state on each task", async () => {
    const { tutor, student, cls } = await scenario();
    const submitted = await makeTask(cls.id, tutor.id);
    const pending = await makeTask(cls.id, tutor.id);
    await prisma.taskSubmission.create({ data: { taskId: submitted.id, studentId: student.id, content: "Done" } });

    const res = await request(app).get(`/api/v1/classes/${cls.id}/tasks`).set(auth(student.token));
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, total: 2 });
    const byId = Object.fromEntries(res.body.data.map((t: { id: string }) => [t.id, t]));
    expect(byId[submitted.id].mySubmission.content).toBe("Done");
    expect(byId[pending.id].mySubmission).toBeNull();
  });

  it("200 — tutors do not get a mySubmission field", async () => {
    const { tutor, cls } = await scenario();
    await makeTask(cls.id, tutor.id);
    const res = await request(app).get(`/api/v1/classes/${cls.id}/tasks`).set(auth(tutor.token));
    expect(res.status).toBe(200);
    expect(res.body.data[0]).not.toHaveProperty("mySubmission");
  });

  it("200 — paginates newest first", async () => {
    const { tutor, cls } = await scenario();
    const first = await makeTask(cls.id, tutor.id);
    await new Promise((r) => setTimeout(r, 5));
    const second = await makeTask(cls.id, tutor.id);
    const res = await request(app).get(`/api/v1/classes/${cls.id}/tasks?limit=1`).set(auth(tutor.token));
    expect(res.body.data.map((t: { id: string }) => t.id)).toEqual([second.id]);
    expect(res.body.meta).toMatchObject({ limit: 1, total: 2, totalPages: 2 });
    expect(first.id).not.toBe(second.id);
  });

  it("404 — a non-member student", async () => {
    const { outsider, cls } = await scenario();
    const res = await request(app).get(`/api/v1/classes/${cls.id}/tasks`).set(auth(outsider.token));
    expect(res.status).toBe(404);
  });

  it("422 — limit above 100", async () => {
    const { tutor, cls } = await scenario();
    const res = await request(app).get(`/api/v1/classes/${cls.id}/tasks?limit=101`).set(auth(tutor.token));
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET/PATCH/DELETE /api/v1/tasks/:id", () => {
  it("200 — a member reads a task; outsiders get 404", async () => {
    const { tutor, student, outsider, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    expect((await request(app).get(`/api/v1/tasks/${task.id}`).set(auth(student.token))).status).toBe(200);
    expect((await request(app).get(`/api/v1/tasks/${task.id}`).set(auth(outsider.token))).status).toBe(404);
    expect((await request(app).get(`/api/v1/tasks/${NONEXISTENT_ID}`).set(auth(tutor.token))).status).toBe(404);
  });

  it("200 — closing then reopening a task toggles status and closedAt", async () => {
    const { tutor, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);

    const closed = await request(app).patch(`/api/v1/tasks/${task.id}`).set(auth(tutor.token)).send({ closed: true });
    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe("CLOSED");
    expect(closed.body.data.closedAt).not.toBeNull();

    const reopened = await request(app).patch(`/api/v1/tasks/${task.id}`).set(auth(tutor.token)).send({ closed: false });
    expect(reopened.body.data).toMatchObject({ status: "OPEN", closedAt: null });
  });

  it("200 — a deadline can be cleared with null", async () => {
    const { tutor, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    await prisma.task.update({ where: { id: task.id }, data: { deadline: new Date() } });
    const res = await request(app).patch(`/api/v1/tasks/${task.id}`).set(auth(tutor.token)).send({ deadline: null });
    expect(res.status).toBe(200);
    expect(res.body.data.deadline).toBeNull();
  });

  it("422 — an empty update", async () => {
    const { tutor, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const res = await request(app).patch(`/api/v1/tasks/${task.id}`).set(auth(tutor.token)).send({});
    expect(res.status).toBe(422);
  });

  it("403 — students cannot edit or delete", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    expect((await request(app).patch(`/api/v1/tasks/${task.id}`).set(auth(student.token)).send({ title: "Hacked" })).status).toBe(403);
    expect((await request(app).delete(`/api/v1/tasks/${task.id}`).set(auth(student.token))).status).toBe(403);
  });

  it("200 — a tutor deletes a task (submissions cascade)", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    await prisma.taskSubmission.create({ data: { taskId: task.id, studentId: student.id, content: "x" } });

    const res = await request(app).delete(`/api/v1/tasks/${task.id}`).set(auth(tutor.token));
    expect(res.status).toBe(200);
    expect(await prisma.task.count({ where: { id: task.id } })).toBe(0);
    expect(await prisma.taskSubmission.count({ where: { taskId: task.id } })).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/tasks/:id/submissions — submit", () => {
  it("201 — a student submits and every tutor is notified", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);

    const res = await request(app).post(`/api/v1/tasks/${task.id}/submissions`).set(auth(student.token)).send({ content: "My answer" });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ taskId: task.id, studentId: student.id, content: "My answer", feedback: null });

    const notes = await prisma.notification.findMany({ where: { userId: tutor.id, type: "TASK_SUBMITTED" } });
    expect(notes).toHaveLength(1);
  });

  it("201 — a file link alone is accepted", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const res = await request(app).post(`/api/v1/tasks/${task.id}/submissions`).set(auth(student.token)).send({ fileUrl: "https://drive.example.com/doc" });
    expect(res.status).toBe(201);
  });

  it("409 — a second submission from the same student", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    await request(app).post(`/api/v1/tasks/${task.id}/submissions`).set(auth(student.token)).send({ content: "First" });
    const res = await request(app).post(`/api/v1/tasks/${task.id}/submissions`).set(auth(student.token)).send({ content: "Second" });
    expect(res.status).toBe(409);
  });

  it("409 — a CLOSED task no longer accepts submissions", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id, "CLOSED");
    const res = await request(app).post(`/api/v1/tasks/${task.id}/submissions`).set(auth(student.token)).send({ content: "Late" });
    expect(res.status).toBe(409);
  });

  it("403 — tutors cannot submit", async () => {
    const { tutor, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const res = await request(app).post(`/api/v1/tasks/${task.id}/submissions`).set(auth(tutor.token)).send({ content: "x" });
    expect(res.status).toBe(403);
  });

  it("404 — a student outside the class", async () => {
    const { tutor, outsider, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const res = await request(app).post(`/api/v1/tasks/${task.id}/submissions`).set(auth(outsider.token)).send({ content: "x" });
    expect(res.status).toBe(404);
  });

  it.each([
    [{}, "neither content nor fileUrl"],
    [{ fileUrl: "not a url" }, "invalid fileUrl"],
  ])("422 — %#: %s", async (body) => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const res = await request(app).post(`/api/v1/tasks/${task.id}/submissions`).set(auth(student.token)).send(body);
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("submissions review — list + feedback", () => {
  it("200 — a tutor lists submissions and leaves feedback", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const sub = await prisma.taskSubmission.create({ data: { taskId: task.id, studentId: student.id, content: "Answer" }, select: { id: true } });

    const list = await request(app).get(`/api/v1/tasks/${task.id}/submissions`).set(auth(tutor.token));
    expect(list.status).toBe(200);
    expect(list.body.data.map((s: { id: string }) => s.id)).toEqual([sub.id]);

    const fb = await request(app)
      .patch(`/api/v1/tasks/${task.id}/submissions/${sub.id}/feedback`)
      .set(auth(tutor.token))
      .send({ feedback: "Great use of the past tense." });
    expect(fb.status).toBe(200);
    expect(fb.body.data.feedback).toBe("Great use of the past tense.");
    expect(fb.body.data.feedbackAt).not.toBeNull();
  });

  it("403 — students cannot list submissions or give feedback", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const sub = await prisma.taskSubmission.create({ data: { taskId: task.id, studentId: student.id, content: "A" }, select: { id: true } });
    expect((await request(app).get(`/api/v1/tasks/${task.id}/submissions`).set(auth(student.token))).status).toBe(403);
    expect((await request(app).patch(`/api/v1/tasks/${task.id}/submissions/${sub.id}/feedback`).set(auth(student.token)).send({ feedback: "A+" })).status).toBe(403);
  });

  it("404 — feedback on a submission that belongs to another task", async () => {
    const { tutor, student, cls } = await scenario();
    const taskA = await makeTask(cls.id, tutor.id);
    const taskB = await makeTask(cls.id, tutor.id);
    const subA = await prisma.taskSubmission.create({ data: { taskId: taskA.id, studentId: student.id, content: "A" }, select: { id: true } });
    const res = await request(app).patch(`/api/v1/tasks/${taskB.id}/submissions/${subA.id}/feedback`).set(auth(tutor.token)).send({ feedback: "x" });
    expect(res.status).toBe(404);
  });

  it("422 — empty feedback", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const sub = await prisma.taskSubmission.create({ data: { taskId: task.id, studentId: student.id, content: "A" }, select: { id: true } });
    const res = await request(app).patch(`/api/v1/tasks/${task.id}/submissions/${sub.id}/feedback`).set(auth(tutor.token)).send({ feedback: "" });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Comments (multipart). Text-only here so no file reaches R2; the file filter
// rejects a disallowed type before anything is stored.
describe("Task comments", () => {
  const post = (taskId: string, token: string, content: string) =>
    request(app).post(`/api/v1/tasks/${taskId}/comments`).set(auth(token)).field("content", content);

  it("201 — a student posts; the whole class (and admin) can read it with the author's class role", async () => {
    const { tutor, student, cls } = await scenario();
    const classmate = await createStudent();
    await addMember(cls.id, classmate.id, "STUDENT");
    const task = await makeTask(cls.id, tutor.id);

    const res = await post(task.id, student.token, "  Is it 150 words?  ");
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ content: "Is it 150 words?", editedAt: null, attachments: [] });
    expect(res.body.data.author).toMatchObject({ id: student.id, classRole: "STUDENT" });

    await post(task.id, tutor.token, "Yes.");
    const admin = await createAdmin();
    for (const reader of [classmate, admin]) {
      const list = await request(app).get(`/api/v1/tasks/${task.id}/comments`).set(auth(reader.token));
      expect(list.status).toBe(200);
      expect(list.body.data.map((c: { content: string }) => c.content)).toEqual(["Is it 150 words?", "Yes."]);
      expect(list.body.data[1].author.classRole).toBe("TUTOR");
    }

    const detail = await request(app).get(`/api/v1/tasks/${task.id}`).set(auth(student.token));
    expect(detail.body.data).toMatchObject({ commentsEnabled: true, commentCount: 2, attachments: [] });
  });

  it("404 — an outsider can neither read nor post", async () => {
    const { tutor, outsider, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    expect((await request(app).get(`/api/v1/tasks/${task.id}/comments`).set(auth(outsider.token))).status).toBe(404);
    expect((await post(task.id, outsider.token, "hi")).status).toBe(404);
  });

  it("422 — a comment with no text and no files", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    expect((await post(task.id, student.token, "   ")).status).toBe(422);
  });

  it("400 — a disallowed file type is rejected before it is stored", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set(auth(student.token))
      .attach("files", Buffer.from("<script>alert(1)</script>"), { filename: "x.html", contentType: "text/html" });
    expect(res.status).toBe(400);
    expect(await prisma.taskComment.count({ where: { taskId: task.id } })).toBe(0);
  });

  it("comments off: students are blocked (403), the tutor can still post, everyone still reads", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const own = await post(task.id, student.token, "before");

    const off = await request(app).patch(`/api/v1/tasks/${task.id}`).set(auth(tutor.token)).send({ commentsEnabled: false });
    expect(off.status).toBe(200);
    expect(off.body.data.commentsEnabled).toBe(false);
    expect((await request(app).patch(`/api/v1/tasks/${task.id}`).set(auth(student.token)).send({ commentsEnabled: true })).status).toBe(403);

    expect((await post(task.id, student.token, "after")).status).toBe(403);
    const edit = await request(app).patch(`/api/v1/tasks/${task.id}/comments/${own.body.data.id}`).set(auth(student.token)).field("content", "x");
    expect(edit.status).toBe(403);
    expect((await post(task.id, tutor.token, "tutor note")).status).toBe(201);
    const list = await request(app).get(`/api/v1/tasks/${task.id}/comments`).set(auth(student.token));
    expect(list.body.data).toHaveLength(2);
  });

  it("edit — only the author; the tutor cannot edit a student's words", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const c = await post(task.id, student.token, "frist");
    const url = `/api/v1/tasks/${task.id}/comments/${c.body.data.id}`;

    expect((await request(app).patch(url).set(auth(tutor.token)).field("content", "hacked")).status).toBe(403);
    const ok = await request(app).patch(url).set(auth(student.token)).field("content", "first");
    expect(ok.status).toBe(200);
    expect(ok.body.data.content).toBe("first");
    expect(ok.body.data.editedAt).not.toBeNull();
    // Clearing the text of a text-only comment would leave it empty
    expect((await request(app).patch(url).set(auth(student.token)).field("content", "")).status).toBe(422);
  });

  it("delete — the author or a tutor, never a classmate", async () => {
    const { tutor, student, cls } = await scenario();
    const classmate = await createStudent();
    await addMember(cls.id, classmate.id, "STUDENT");
    const task = await makeTask(cls.id, tutor.id);
    const a = await post(task.id, student.token, "mine");
    const b = await post(task.id, student.token, "moderated");
    const del = (id: string, token: string) => request(app).delete(`/api/v1/tasks/${task.id}/comments/${id}`).set(auth(token));

    expect((await del(a.body.data.id, classmate.token)).status).toBe(403);
    expect((await del(a.body.data.id, student.token)).status).toBe(200);
    expect((await del(b.body.data.id, tutor.token)).status).toBe(200);
    expect(await prisma.taskComment.count({ where: { taskId: task.id } })).toBe(0);
  });

  it("409 — no new comments in an archived class", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id, { archived: true });
    const task = await makeTask(cls.id, tutor.id);
    expect((await post(task.id, tutor.token, "hi")).status).toBe(409);
  });

  it("task files — students cannot attach to the task itself (403)", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .set(auth(student.token))
      .attach("files", Buffer.from("hello"), { filename: "notes.txt", contentType: "text/plain" });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Hand-in files are private: the student who handed in and the tutors only.
// Rows are inserted directly so nothing reaches R2.
describe("Submission files", () => {
  it("never show up in the task's own files, and only the owner or a tutor gets a download link", async () => {
    const { tutor, student, cls } = await scenario();
    const classmate = await createStudent();
    await addMember(cls.id, classmate.id, "STUDENT");
    const task = await makeTask(cls.id, tutor.id);
    const sub = await prisma.taskSubmission.create({ data: { taskId: task.id, studentId: student.id, content: "Mine" }, select: { id: true } });
    const file = await prisma.taskAttachment.create({
      data: { taskId: task.id, submissionId: sub.id, uploadedById: student.id, fileName: "essay.pdf", fileUrl: "https://files.example.test/essay.pdf", mimeType: "application/pdf", size: 10 },
      select: { id: true },
    });

    const seen = await request(app).get(`/api/v1/tasks/${task.id}`).set(auth(classmate.token));
    expect(seen.body.data.attachments).toEqual([]);

    const link = (token: string) => request(app).get(`/api/v1/tasks/${task.id}/attachments/${file.id}/download`).set(auth(token));
    expect((await link(classmate.token)).status).toBe(404);
    expect((await link(student.token)).status).toBe(200);
    expect((await link(tutor.token)).status).toBe(200);

    const subs = await request(app).get(`/api/v1/tasks/${task.id}/submissions`).set(auth(tutor.token));
    expect(subs.body.data[0].attachments.map((a: { fileName: string }) => a.fileName)).toEqual(["essay.pdf"]);
  });

  it("422 — handing in nothing", async () => {
    const { tutor, student, cls } = await scenario();
    const task = await makeTask(cls.id, tutor.id);
    const res = await request(app).post(`/api/v1/tasks/${task.id}/submissions`).set(auth(student.token)).field("content", "  ");
    expect(res.status).toBe(422);
  });
});
