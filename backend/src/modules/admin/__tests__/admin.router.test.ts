import { describe, it, expect, afterAll } from "bun:test";
import {
  app,
  request,
  prisma,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../../test/helpers.ts";

// ───────────────────────────────────────────────────────────────────────────
// Phase 6b — Admin (ALL routes guarded: authenticate + authorize("ADMIN"))
//   PATCH  /admin/users/:id                — role / isActive
//   PUT    /admin/users/:id/subscription   — assign plan (FREE/GOLD/PREMIUM)
//   DELETE /admin/users/:id/subscription   — cancel → downgrades to FREE ACTIVE
//   GET    /admin/dashboard                — platform-wide aggregates
// ───────────────────────────────────────────────────────────────────────────

const NONEXISTENT_ID = "00000000-0000-4000-8000-000000000000";
const createdUserIds: string[] = [];

const track = (u: TestUser) => (createdUserIds.push(u.id), u);
const createStudent = async () => track(await createTestUser({ role: "STUDENT" }));
const createTutor = async () => track(await createTestUser({ role: "TUTOR" }));
const createAdmin = async () => track(await createTestUser({ role: "ADMIN" }));
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

afterAll(async () => {
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("PATCH /api/v1/admin/users/:id", () => {
  it("200 — admin promotes a user's role", async () => {
    const admin = await createAdmin();
    const student = await createStudent();
    const res = await request(app)
      .patch(`/api/v1/admin/users/${student.id}`)
      .set(auth(admin.token))
      .send({ role: "TUTOR" });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("TUTOR");
  });

  it("200 — admin deactivates a user (soft ban)", async () => {
    const admin = await createAdmin();
    const student = await createStudent();
    const res = await request(app)
      .patch(`/api/v1/admin/users/${student.id}`)
      .set(auth(admin.token))
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it("422 — empty body (at least one of role/isActive required)", async () => {
    const admin = await createAdmin();
    const student = await createStudent();
    const res = await request(app)
      .patch(`/api/v1/admin/users/${student.id}`)
      .set(auth(admin.token))
      .send({});
    expect(res.status).toBe(422);
  });

  it("404 — nonexistent user", async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .patch(`/api/v1/admin/users/${NONEXISTENT_ID}`)
      .set(auth(admin.token))
      .send({ role: "TUTOR" });
    expect(res.status).toBe(404);
  });

  it("403 — a non-admin (tutor) is blocked", async () => {
    const tutor = await createTutor();
    const student = await createStudent();
    const res = await request(app)
      .patch(`/api/v1/admin/users/${student.id}`)
      .set(auth(tutor.token))
      .send({ role: "ADMIN" });
    expect(res.status).toBe(403);
  });

  it("401 — no token", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${NONEXISTENT_ID}`)
      .send({ role: "TUTOR" });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("PUT /api/v1/admin/users/:id/subscription", () => {
  it("200 — assign GOLD with durationMonths → ACTIVE, future period end, CASH default", async () => {
    const admin = await createAdmin();
    const student = await createStudent();
    const res = await request(app)
      .put(`/api/v1/admin/users/${student.id}/subscription`)
      .set(auth(admin.token))
      .send({ plan: "GOLD", durationMonths: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBe("GOLD");
    expect(res.body.data.status).toBe("ACTIVE");
    expect(res.body.data.paymentProvider).toBe("CASH");
    expect(new Date(res.body.data.currentPeriodEnd).getTime()).toBeGreaterThan(Date.now());
  });

  it("200 — assign FREE → permanent (no period end)", async () => {
    const admin = await createAdmin();
    const student = await createStudent();
    const res = await request(app)
      .put(`/api/v1/admin/users/${student.id}/subscription`)
      .set(auth(admin.token))
      .send({ plan: "FREE" });
    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBe("FREE");
    expect(res.body.data.currentPeriodEnd).toBeNull();
  });

  it("422 — GOLD without durationMonths or endDate", async () => {
    const admin = await createAdmin();
    const student = await createStudent();
    const res = await request(app)
      .put(`/api/v1/admin/users/${student.id}/subscription`)
      .set(auth(admin.token))
      .send({ plan: "GOLD" });
    expect(res.status).toBe(422);
  });

  it("422 — endDate in the past", async () => {
    const admin = await createAdmin();
    const student = await createStudent();
    const res = await request(app)
      .put(`/api/v1/admin/users/${student.id}/subscription`)
      .set(auth(admin.token))
      .send({ plan: "PREMIUM", endDate: new Date(Date.now() - 86400000).toISOString() });
    expect(res.status).toBe(422);
  });

  it("404 — nonexistent user", async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .put(`/api/v1/admin/users/${NONEXISTENT_ID}/subscription`)
      .set(auth(admin.token))
      .send({ plan: "GOLD", durationMonths: 1 });
    expect(res.status).toBe(404);
  });

  it("403 — a non-admin is blocked", async () => {
    const student = await createStudent();
    const target = await createStudent();
    const res = await request(app)
      .put(`/api/v1/admin/users/${target.id}/subscription`)
      .set(auth(student.token))
      .send({ plan: "GOLD", durationMonths: 1 });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("DELETE /api/v1/admin/users/:id/subscription", () => {
  it("200 — cancelling a paid plan downgrades to FREE ACTIVE", async () => {
    const admin = await createAdmin();
    const student = track(
      await createTestUser({
        role: "STUDENT",
        plan: "PREMIUM",
        status: "ACTIVE",
        paymentProvider: "CASH",
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      }),
    );
    const res = await request(app)
      .delete(`/api/v1/admin/users/${student.id}/subscription`)
      .set(auth(admin.token));
    expect(res.status).toBe(200);

    const sub = await prisma.subscription.findUnique({ where: { userId: student.id } });
    expect(sub?.plan).toBe("FREE");
    expect(sub?.status).toBe("ACTIVE");
    expect(sub?.currentPeriodEnd).toBeNull();
  });

  it("404 — user has no subscription to cancel", async () => {
    const admin = await createAdmin();
    const noSub = track(await createTestUser({ role: "STUDENT", plan: null }));
    const res = await request(app)
      .delete(`/api/v1/admin/users/${noSub.id}/subscription`)
      .set(auth(admin.token));
    expect(res.status).toBe(404);
  });

  it("404 — nonexistent user", async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .delete(`/api/v1/admin/users/${NONEXISTENT_ID}/subscription`)
      .set(auth(admin.token));
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/admin/dashboard", () => {
  it("200 — returns platform-wide aggregate shape", async () => {
    const admin = await createAdmin();
    const res = await request(app).get("/api/v1/admin/dashboard").set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(typeof res.body.data.users.total).toBe("number");
    expect(res.body.data.users.byRole).toBeDefined();
    expect(res.body.data.subscriptions).toBeDefined();
    expect(res.body.data.activeUsers).toBeDefined();
    expect(typeof res.body.data.totalSessionsToday).toBe("number");
  });

  it("403 — a non-admin is blocked", async () => {
    const tutor = await createTutor();
    const res = await request(app).get("/api/v1/admin/dashboard").set(auth(tutor.token));
    expect(res.status).toBe(403);
  });
});
