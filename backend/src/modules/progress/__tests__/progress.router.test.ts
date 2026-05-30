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
// Phase 5c — Progress (daily snapshots: list, today-on-demand, summary)
// One row per user per calendar day (unique userId+date, date is @db.Date).
// ───────────────────────────────────────────────────────────────────────────

const createdUserIds: string[] = [];
const user = (u: TestUser) => (createdUserIds.push(u.id), u);
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

/** Local midnight, `offsetDays` ago — matches how the service keys progress rows. */
function dayAt(offsetDays: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}

const makeProgress = (userId: string, date: Date, data: Record<string, number> = {}) =>
  prisma.progress.create({ data: { userId, date, ...data }, select: { id: true } });

afterAll(async () => {
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/progress — list", () => {
  it("200 — lists the caller's daily entries (newest first) with meta", async () => {
    const u = user(await createTestUser());
    await makeProgress(u.id, dayAt(0), { sessionsCount: 1 });
    await makeProgress(u.id, dayAt(1), { sessionsCount: 2 });

    const res = await request(app).get("/api/v1/progress").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(2);
    // ordered by date desc → today first
    expect(new Date(res.body.data[0].date).getTime()).toBeGreaterThan(
      new Date(res.body.data[1].date).getTime(),
    );
  });

  it("200 — ?startDate filters out earlier entries", async () => {
    const u = user(await createTestUser());
    await makeProgress(u.id, dayAt(0));
    await makeProgress(u.id, dayAt(10));

    const startDate = dayAt(5).toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/v1/progress?startDate=${startDate}`)
      .set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("422 — limit over the max of 100", async () => {
    const u = user(await createTestUser());
    const res = await request(app).get("/api/v1/progress?limit=999").set(auth(u.token));
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/progress");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/progress/today", () => {
  it("200 — creates today's row on demand for a user with no history", async () => {
    const u = user(await createTestUser());
    const res = await request(app).get("/api/v1/progress/today").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.sessionsCount).toBe(0);
    expect(res.body.data.vocabularyPracticed).toBe(0);
  });

  it("200 — is idempotent (second call returns the same row)", async () => {
    const u = user(await createTestUser());
    const first = await request(app).get("/api/v1/progress/today").set(auth(u.token));
    const second = await request(app).get("/api/v1/progress/today").set(auth(u.token));
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/progress/summary", () => {
  it("200 — defaults to a 7-day window and returns chart-ready rows", async () => {
    const u = user(await createTestUser());
    await makeProgress(u.id, dayAt(0), { studyMinutes: 30 });
    await makeProgress(u.id, dayAt(2), { studyMinutes: 15 });

    const res = await request(app).get("/api/v1/progress/summary").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    // ascending by date, ISO yyyy-mm-dd strings
    expect(res.body.data[0].date < res.body.data[1].date).toBe(true);
  });

  it("200 — respects ?days=30", async () => {
    const u = user(await createTestUser());
    const res = await request(app).get("/api/v1/progress/summary?days=30").set(auth(u.token));
    expect(res.status).toBe(200);
  });

  it("422 — days must be one of 7/14/30", async () => {
    const u = user(await createTestUser());
    const res = await request(app).get("/api/v1/progress/summary?days=10").set(auth(u.token));
    expect(res.status).toBe(422);
  });

  it("422 — non-numeric days", async () => {
    const u = user(await createTestUser());
    const res = await request(app).get("/api/v1/progress/summary?days=abc").set(auth(u.token));
    expect(res.status).toBe(422);
  });
});
