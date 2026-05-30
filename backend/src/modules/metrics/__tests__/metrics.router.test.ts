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
// Phase 6a — Metrics (own metrics upsert; student metrics with tutor/admin authz)
// GET /metrics/:userId is route-guarded authorize("TUTOR","ADMIN"); the service
// additionally requires a tutor to share a class with the target student (else 404).
// ───────────────────────────────────────────────────────────────────────────

const NONEXISTENT_ID = "00000000-0000-4000-8000-000000000000";
const createdUserIds: string[] = [];
const createdClassIds: string[] = [];

const track = (u: TestUser) => (createdUserIds.push(u.id), u);
const createStudent = async () => track(await createTestUser({ role: "STUDENT" }));
const createTutor = async () => track(await createTestUser({ role: "TUTOR" }));
const createAdmin = async () => track(await createTestUser({ role: "ADMIN" }));
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function classWith(tutorId: string, studentId: string) {
  const cls = await prisma.class.create({
    data: {
      className: "Metrics Class",
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

afterAll(async () => {
  await prisma.class.deleteMany({ where: { id: { in: createdClassIds } } });
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/metrics/me", () => {
  it("200 — returns the caller's metrics", async () => {
    const u = await createStudent();
    const res = await request(app).get("/api/v1/metrics/me").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBe(u.id);
    expect(res.body.data.currentStreak).toBeDefined();
  });

  it("200 — auto-creates a zeroed metrics row when none exists (upsert)", async () => {
    const u = await createStudent();
    await prisma.userMetrics.delete({ where: { userId: u.id } });
    const res = await request(app).get("/api/v1/metrics/me").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.currentStreak).toBe(0);
    expect(res.body.data.totalStudyTimeMinutes).toBe(0);
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/metrics/me");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/metrics/:userId", () => {
  it("200 — an admin can view any user's metrics", async () => {
    const student = await createStudent();
    const admin = await createAdmin();
    const res = await request(app).get(`/api/v1/metrics/${student.id}`).set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBe(student.id);
  });

  it("200 — a tutor can view a student in their class", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    await classWith(tutor.id, student.id);
    const res = await request(app).get(`/api/v1/metrics/${student.id}`).set(auth(tutor.token));
    expect(res.status).toBe(200);
  });

  it("404 — a tutor cannot view a student not in their class", async () => {
    const tutor = await createTutor();
    const stranger = await createStudent();
    const res = await request(app).get(`/api/v1/metrics/${stranger.id}`).set(auth(tutor.token));
    expect(res.status).toBe(404);
  });

  it("403 — a student (global role) is blocked at the route guard", async () => {
    const student = await createStudent();
    const other = await createStudent();
    const res = await request(app).get(`/api/v1/metrics/${other.id}`).set(auth(student.token));
    expect(res.status).toBe(403);
  });

  it("404 — admin requesting metrics for a nonexistent user", async () => {
    const admin = await createAdmin();
    const res = await request(app).get(`/api/v1/metrics/${NONEXISTENT_ID}`).set(auth(admin.token));
    expect(res.status).toBe(404);
  });

  it("401 — no token", async () => {
    const res = await request(app).get(`/api/v1/metrics/${NONEXISTENT_ID}`);
    expect(res.status).toBe(401);
  });
});
