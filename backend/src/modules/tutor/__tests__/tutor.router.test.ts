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
// Returns an aggregated snapshot: classes, students, skills, sessionsToday,
// recentActivity. All sections default to zero when the tutor has no data.
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

async function makeClass(tutorUserId: string, status: "ACTIVE" | "INACTIVE" = "ACTIVE") {
  const cls = await prisma.class.create({
    data: {
      className: "Test Class",
      classCode: generateClassCode(),
      classStatus: status,
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
  it("200 — TUTOR with no classes returns zeroed response with correct shape", async () => {
    const tutor = await createTutor();

    const res = await request(app)
      .get("/api/v1/tutor/dashboard")
      .set(auth(tutor.token));

    expect(res.status).toBe(200);
    const d = res.body.data;

    expect(d.classes).toMatchObject({ total: 0, active: 0 });
    expect(d.students).toMatchObject({ total: 0, activeToday: 0, activeThisWeek: 0 });
    expect(d.skills).toMatchObject({ avgGrammar: 0, avgVocabulary: 0, avgFluency: 0, avgSpeaking: 0 });
    expect(d.sessionsToday).toBe(0);
    expect(d.recentActivity).toEqual([]);
  });

  it("200 — ADMIN with no classes also gets a valid zeroed response", async () => {
    const admin = await createAdmin();

    const res = await request(app)
      .get("/api/v1/tutor/dashboard")
      .set(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.classes).toMatchObject({ total: 0, active: 0 });
  });

  it("200 — TUTOR with one ACTIVE and one INACTIVE class: classes.total=2, classes.active=1", async () => {
    const tutor = await createTutor();
    await makeClass(tutor.id, "ACTIVE");
    await makeClass(tutor.id, "INACTIVE");

    const res = await request(app)
      .get("/api/v1/tutor/dashboard")
      .set(auth(tutor.token));

    expect(res.status).toBe(200);
    expect(res.body.data.classes.total).toBe(2);
    expect(res.body.data.classes.active).toBe(1);
    // No students yet
    expect(res.body.data.students.total).toBe(0);
    expect(res.body.data.sessionsToday).toBe(0);
    expect(res.body.data.recentActivity).toEqual([]);
  });

  it("200 — students.total reflects unique students across classes", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const s1 = await createStudent();
    const s2 = await createStudent();
    await addStudent(cls.id, s1.id);
    await addStudent(cls.id, s2.id);

    const res = await request(app)
      .get("/api/v1/tutor/dashboard")
      .set(auth(tutor.token));

    expect(res.status).toBe(200);
    expect(res.body.data.students.total).toBe(2);
  });

  it("200 — same student in two classes is only counted once in students.total", async () => {
    const tutor = await createTutor();
    const cls1 = await makeClass(tutor.id);
    const cls2 = await makeClass(tutor.id);
    const student = await createStudent();
    await addStudent(cls1.id, student.id);
    await addStudent(cls2.id, student.id);

    const res = await request(app)
      .get("/api/v1/tutor/dashboard")
      .set(auth(tutor.token));

    expect(res.status).toBe(200);
    expect(res.body.data.students.total).toBe(1); // deduplicated
  });

  it("200 — skills reflect average UserMetrics across students (rounds to nearest int)", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);

    const s1 = track(await createTestUser({
      role: "STUDENT",
      metrics: { grammarSkill: 80, vocabularySkill: 60, fluencySkill: 70, speakingSkill: 50 },
    }));
    const s2 = track(await createTestUser({
      role: "STUDENT",
      metrics: { grammarSkill: 60, vocabularySkill: 40, fluencySkill: 50, speakingSkill: 30 },
    }));
    await addStudent(cls.id, s1.id);
    await addStudent(cls.id, s2.id);

    const res = await request(app)
      .get("/api/v1/tutor/dashboard")
      .set(auth(tutor.token));

    expect(res.status).toBe(200);
    const skills = res.body.data.skills;
    expect(skills.avgGrammar).toBe(70);    // (80+60)/2
    expect(skills.avgVocabulary).toBe(50); // (60+40)/2
    expect(skills.avgFluency).toBe(60);    // (70+50)/2
    expect(skills.avgSpeaking).toBe(40);   // (50+30)/2
  });

  it("200 — recentActivity contains the expected fields", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const student = await createStudent();
    await addStudent(cls.id, student.id);

    // Create a session for the student
    await prisma.conversationSession.create({
      data: {
        userId: student.id,
        mode: "TEXT",
      },
    });

    const res = await request(app)
      .get("/api/v1/tutor/dashboard")
      .set(auth(tutor.token));

    expect(res.status).toBe(200);
    const activity = res.body.data.recentActivity;
    expect(activity.length).toBeGreaterThanOrEqual(1);

    const entry = activity[0];
    expect(entry).toHaveProperty("userId");
    expect(entry).toHaveProperty("displayName");
    expect(entry).toHaveProperty("avatarUrl");
    expect(entry).toHaveProperty("sessionMode");
    expect(entry).toHaveProperty("startedAt");
    expect(entry).toHaveProperty("avgOverallScore");
    expect(entry).toHaveProperty("className");

    expect(entry.sessionMode).toBe("TEXT");
    expect(entry.userId).toBe(student.id);
    expect(entry.avgOverallScore).toBeNull(); // no evaluation
  });

  it("200 — sessionsToday counts only sessions started today", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const student = await createStudent();
    await addStudent(cls.id, student.id);

    // A session from yesterday — should not count toward sessionsToday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await prisma.conversationSession.create({
      data: { userId: student.id, mode: "TEXT", startedAt: yesterday },
    });

    // A session from today
    await prisma.conversationSession.create({
      data: { userId: student.id, mode: "TEXT" },
    });

    const res = await request(app)
      .get("/api/v1/tutor/dashboard")
      .set(auth(tutor.token));

    expect(res.status).toBe(200);
    expect(res.body.data.sessionsToday).toBe(1);
  });

  it("403 — STUDENT role is rejected", async () => {
    const student = await createStudent();

    const res = await request(app)
      .get("/api/v1/tutor/dashboard")
      .set(auth(student.token));

    expect(res.status).toBe(403);
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/tutor/dashboard");
    expect(res.status).toBe(401);
  });

  it("200 — internal (stealth) student members are not counted in students.total", async () => {
    const tutor = await createTutor();
    const cls = await makeClass(tutor.id);
    const student = await createStudent();
    const internal = track(await createTestUser({ role: "STUDENT", isInternal: true }));
    await addStudent(cls.id, student.id);
    await addStudent(cls.id, internal.id);

    const res = await request(app)
      .get("/api/v1/tutor/dashboard")
      .set(auth(tutor.token));

    expect(res.status).toBe(200);
    expect(res.body.data.students.total).toBe(1);
  });
});
