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
// Phase 6c — Subscriptions
//   GET /users/me/subscription  — own subscription record (lives in users module)
//   FIB billing routes are external/credential-gated — only the auth guard is
//   asserted here (success paths require live FIB sandbox config).
// ───────────────────────────────────────────────────────────────────────────

const createdUserIds: string[] = [];
const track = (u: TestUser) => (createdUserIds.push(u.id), u);
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

afterAll(async () => {
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/users/me/subscription", () => {
  it("200 — returns the caller's subscription record", async () => {
    const u = track(await createTestUser({ plan: "PREMIUM", status: "ACTIVE", paymentProvider: "CASH" }));
    const res = await request(app).get("/api/v1/users/me/subscription").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBe("PREMIUM");
    expect(res.body.data.status).toBe("ACTIVE");
    expect(res.body.data.paymentProvider).toBe("CASH");
  });

  it("200 — FREE user has a subscription with null payment provider", async () => {
    const u = track(await createTestUser({ plan: "FREE", status: "ACTIVE" }));
    const res = await request(app).get("/api/v1/users/me/subscription").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBe("FREE");
    expect(res.body.data.paymentProvider).toBeNull();
  });

  it("404 — user without a subscription row", async () => {
    const u = track(await createTestUser({ plan: null }));
    const res = await request(app).get("/api/v1/users/me/subscription").set(auth(u.token));
    expect(res.status).toBe(404);
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/users/me/subscription");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("FIB billing routes — auth guard", () => {
  it("401 — POST /subscriptions/initiate-fib requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/subscriptions/initiate-fib")
      .send({ plan: "GOLD", intervalMonths: 1 });
    expect(res.status).toBe(401);
  });

  it("401 — GET /subscriptions/fib/:id/status requires authentication", async () => {
    const res = await request(app).get("/api/v1/subscriptions/fib/some-id/status");
    expect(res.status).toBe(401);
  });
});
