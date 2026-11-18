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
// Tutor Dashboard — GET /api/v1/tutor/dashboard
//
// Access: TUTOR or ADMIN only (authenticate + authorize("TUTOR","ADMIN")).
// Built around what needs the tutor next: hand-ins to review, deadlines soon, students
// who stopped practising, per-class health. Archived classes are left out; skill
// averages only count students who have practised.
// ───────────────────────────────────────────────────────────────────────────

const createdUserIds: string[] = [];
const createdClassIds: string[] = [];

function track(u: TestUser): TestUser {
  createdUserIds.push(u.id);
  return u;
}
const createTutor = async () => track(await createTestUser({ role: "TUTOR" }));
const createAdmin = async () => track(await createTestUser({ role: "ADMIN" }));
const createStudent = async () => track(await createTestUser({ role: "STUDENT" }));

async function makeClass(tutorUserId: string, status: "ACTIVE" | "INACTIVE" = "ACTIVE", archived = false) {
  const cls = await prisma.class.create({
    data: {
      className: "Test Class",
      classCode: generateClassCode(),
      classStatus: status,
      archived,
      classCodeBlocked: false,
      createdById: tutorUserId,
      users: { create: { userId: tutorUserId, role: "TUTOR" } },
    },
    select: { id: true },
  });
  createdClassIds.push(cls.id);
  return cls;
}

const addStudent = (classId: string, userId: string) =>
  prisma.classUser.create({ data: { classId, userId, role: "STUDENT" }, select: { id: true } });

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

afterAll(async () => {
  await prisma.class.deleteMany({ where: { id: { in: createdClassIds } } });
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/tutor/dashboard", () => {
  const get = (token: string) => request(app).get("/api/v1/tutor/dashboard").set(auth(token));
  const DAY = 86_400_000;

  it("200 — a tutor with no classes gets the zeroed shape", async () => {
    const tutor = await createTutor();
    const res = await get(tutor.token);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totals: { classes: 0, students: 0, activeThisWeek: 0, toReview: 0, missing: 0 },
      needsYou: { toReview: [], dueSoon: [], inactive: [], inactiveCount: 0 },
      classes: [],
      commonMistakes: [],
    });
  });

  it("200 — an ADMIN with no classes also gets a valid response", async () => {
    const admin = await createAdmin();
    expect((await get(admin.token)).status).toBe(200);
  });

  it("archived classes are left out; a student in two classes counts once; internal accounts never", async () => {
    const tutor = await createTutor();
    const a = await makeClass(tutor.id);
    const b = await makeClass(tutor.id);
    const old = await makeClass(tutor.id, "ACTIVE", true);
    const s = await createStudent();
    const stealth = track(await createTestUser({ role: "STUDENT", isInternal: true }));
    await addStudent(a.id, s.id);
    await addStudent(b.id, s.id);
    await addStudent(a.id, stealth.id);
    await addStudent(old.id, (await createStudent()).id);
    const d = (await get(tutor.token)).body.data;
    expect(d.totals).toMatchObject({ classes: 2, students: 1 });
    expect(d.classes.map((c: { id: string }) => c.id).sort()).toEqual([a.id, b.id].sort());
  });

  it("skill averages only count students who have practised", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const practised = track(await createTestUser({ role: "STUDENT", metrics: { grammarSkill: 80, vocabularySkill: 70, fluencySkill: 60, speakingSkill: 0 } }));
    const never = await createStudent();
    await addStudent(cls.id, practised.id);
    await addStudent(cls.id, never.id);
    const d = (await get(tutor.token)).body.data;
    expect(d.skills).toMatchObject({ grammar: 80, vocabulary: 70, fluency: 60, speaking: 0, practisingStudents: 1 });
  });

  it("needs-you: hand-ins to review, deadlines this week, silent students; class hand-in rate", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const ali = await createStudent();
    const yuki = await createStudent();
    await addStudent(cls.id, ali.id);
    await addStudent(cls.id, yuki.id);
    const past = await prisma.task.create({ data: { classId: cls.id, createdById: tutor.id, title: "Past", description: "d", deadline: new Date(Date.now() - DAY) }, select: { id: true } });
    const soon = await prisma.task.create({ data: { classId: cls.id, createdById: tutor.id, title: "Soon", description: "d", deadline: new Date(Date.now() + 3 * DAY) }, select: { id: true } });
    await prisma.taskSubmission.create({ data: { taskId: past.id, studentId: ali.id, content: "done" } });
    // Ali practised today; Yuki never did
    const session = await prisma.conversationSession.create({ data: { userId: ali.id }, select: { id: true } });
    await prisma.message.create({ data: { userId: ali.id, sessionId: session.id, role: "USER", content: "hi" } });

    const d = (await get(tutor.token)).body.data;
    expect(d.needsYou.toReview).toHaveLength(1);
    expect(d.needsYou.toReview[0]).toMatchObject({ taskId: past.id, taskTitle: "Past" });
    expect(d.needsYou.dueSoon[0]).toMatchObject({ taskId: soon.id, handedIn: 0, students: 2 });
    expect(d.needsYou.inactive.map((s: { userId: string }) => s.userId)).toEqual([yuki.id]);
    expect(d.classes[0]).toMatchObject({ students: 2, activeThisWeek: 1, handInRate: 50, missing: 1, toReview: 1 });
    expect(d.totals).toMatchObject({ activeThisWeek: 1, toReview: 1, missing: 1 });
  });

  it("403 — STUDENT role is rejected", async () => {
    const student = await createStudent();
    expect((await get(student.token)).status).toBe(403);
  });

  it("401 — no token", async () => {
    expect((await request(app).get("/api/v1/tutor/dashboard")).status).toBe(401);
  });
});
