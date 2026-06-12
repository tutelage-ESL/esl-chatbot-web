import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.ts";
import { env } from "../../../config/env.ts";
import { prisma } from "../../../config/database.ts";
import { createTestUser, deleteTestUsers, type TestUser } from "../../../test/helpers.ts";

// Self-contained users created by the self-profile / getUser tests below. Tracked
// here and deleted in afterAll (before disconnect) so the seed users are untouched.
const createdUserIds: string[] = [];
const track = (u: TestUser) => (createdUserIds.push(u.id), u);
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

// ─── Seed credentials (from prisma/seed.ts) ──────────────────────────────────

const ADMIN_CREDS = { username: "admin_main", password: "password123" };
const TUTOR_CREDS = { username: "tutor_sarah", password: "password123" };
const STUDENT_CREDS = { username: "student_ali", password: "password123" };

// ─── Tokens obtained via real login ──────────────────────────────────────────

let adminToken: string;
let tutorToken: string;
let studentToken: string;

beforeAll(async () => {
  // Login with each role — this tests the full auth flow, not just middleware
  const [adminRes, tutorRes, studentRes] = await Promise.all([
    request(app).post("/api/v1/auth/login").send(ADMIN_CREDS),
    request(app).post("/api/v1/auth/login").send(TUTOR_CREDS),
    request(app).post("/api/v1/auth/login").send(STUDENT_CREDS),
  ]);

  // Fail fast: if login itself is broken, every downstream test would give
  // a misleading 401 rather than pointing at the real problem
  if (adminRes.status !== 200) {
    throw new Error(
      `Admin login failed (${adminRes.status}): ${adminRes.body.message}. ` +
        "Make sure the DB is running and seeded (bun run db:seed).",
    );
  }
  if (tutorRes.status !== 200) {
    throw new Error(`Tutor login failed (${tutorRes.status}): ${tutorRes.body.message}`);
  }
  if (studentRes.status !== 200) {
    throw new Error(`Student login failed (${studentRes.status}): ${studentRes.body.message}`);
  }

  adminToken = adminRes.body.data.accessToken;
  tutorToken = tutorRes.body.data.accessToken;
  studentToken = studentRes.body.data.accessToken;
});

afterAll(async () => {
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─── Helpers for edge-case tokens (cannot be obtained via normal login) ───────

/**
 * Token signed with the correct secret but already expired.
 * There is no way to get an expired token through login, so we craft it.
 */
function makeExpiredToken(): string {
  return jwt.sign(
    {
      sub: "00000000-0000-0000-0000-000000000099",
      username: "test_user",
      email: "test@tutelage.com",
      role: "ADMIN",
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in the past
    },
    env.JWT_ACCESS_SECRET,
  );
}

/**
 * Token with a valid structure but signed with the wrong secret.
 * There is no way to get a wrong-secret token through login, so we craft it.
 */
function makeTokenWithWrongSecret(): string {
  return jwt.sign(
    {
      sub: "00000000-0000-0000-0000-000000000099",
      username: "test_user",
      email: "test@tutelage.com",
      role: "ADMIN",
    },
    "this-is-definitely-the-wrong-secret",
    { expiresIn: "15m" } as jwt.SignOptions,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/users", () => {
  // ── 401: Authentication failures ──────────────────────────────────────────

  describe("401 — Authentication failures", () => {
    it("returns 401 when no Authorization header is sent", async () => {
      const res = await request(app).get("/api/v1/users");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Authentication required");
      expect(res.body.data).toBeNull();
    });

    it("returns 401 when Authorization header is missing the Bearer prefix", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Token ${adminToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Authentication required");
      expect(res.body.data).toBeNull();
    });

    it("returns 401 when the token is signed with the wrong secret", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${makeTokenWithWrongSecret()}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid or expired access token");
      expect(res.body.data).toBeNull();
    });

    it("returns 401 when the token is completely malformed (random string)", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", "Bearer this.is.not.a.jwt");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid or expired access token");
      expect(res.body.data).toBeNull();
    });

    it("returns 401 when the token is expired", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${makeExpiredToken()}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid or expired access token");
      expect(res.body.data).toBeNull();
    });
  });

  // ── 403: Authorization failures ───────────────────────────────────────────

  describe("403 — Authorization failures (real tokens, wrong role)", () => {
    it("returns 403 when logged in as STUDENT (student_ali)", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Access denied. Required role: ADMIN");
      expect(res.body.data).toBeNull();
    });

    it("returns 403 when logged in as TUTOR (tutor_sarah)", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${tutorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Access denied. Required role: ADMIN");
      expect(res.body.data).toBeNull();
    });
  });

  // ── 200: Success ──────────────────────────────────────────────────────────

  describe("200 — Success (logged in as admin_main)", () => {
    it("returns 200 with a paginated user list", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Users retrieved successfully");
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("includes the seeded users (4 total from seed)", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(4); // admin, tutor, student_ali, student_yuki
    });

    it("includes correct pagination meta", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { meta } = res.body;
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(10);
      expect(meta.total).toBe(4);
      expect(meta.totalPages).toBe(1);
    });

    it("returns users with the expected fields and never exposes passwords", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      for (const user of res.body.data) {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("username");
        expect(user).toHaveProperty("displayName");
        expect(user).toHaveProperty("role");
        expect(user).toHaveProperty("isActive");
        expect(user).toHaveProperty("createdAt");
        // Password must never be exposed
        expect(user).not.toHaveProperty("password");
      }
    });

    it("respects ?page and ?limit query parameters", async () => {
      const res = await request(app)
        .get("/api/v1/users?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.totalPages).toBe(2); // 4 users / 2 per page
    });

    it("returns the second page correctly", async () => {
      const res = await request(app)
        .get("/api/v1/users?page=2&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.data.length).toBe(2);
    });
  });

  // ── 422: Validation failures ──────────────────────────────────────────────

  describe("422 — Validation failures", () => {
    it("returns 422 when page is not a valid number", async () => {
      const res = await request(app)
        .get("/api/v1/users?page=abc")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("returns 422 when limit exceeds the maximum of 100", async () => {
      const res = await request(app)
        .get("/api/v1/users?limit=999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/users/me — own profile", () => {
  it("200 — returns the caller's full profile with subscription summary", async () => {
    const u = track(await createTestUser({ plan: "PREMIUM", status: "ACTIVE" }));
    const res = await request(app).get("/api/v1/users/me").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(u.id);
    expect(res.body.data.username).toBe(u.username);
    expect(res.body.data.authProvider).toBe("LOCAL");
    expect(res.body.data.subscription.plan).toBe("PREMIUM");
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("PATCH /api/v1/users/me — update own profile", () => {
  it("200 — updates displayName and phoneNumber", async () => {
    const u = track(await createTestUser());
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set(auth(u.token))
      .send({ displayName: "Renamed User", phoneNumber: "+9647500000000" });
    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe("Renamed User");
    expect(res.body.data.phoneNumber).toBe("+9647500000000");
  });

  it("200 — phoneNumber can be cleared with null", async () => {
    const u = track(await createTestUser());
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set(auth(u.token))
      .send({ phoneNumber: null });
    expect(res.status).toBe(200);
    expect(res.body.data.phoneNumber).toBeNull();
  });

  it("422 — empty displayName", async () => {
    const u = track(await createTestUser());
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set(auth(u.token))
      .send({ displayName: "" });
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app).patch("/api/v1/users/me").send({ displayName: "x" });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("PATCH /api/v1/users/me/learner-profile — update learner settings", () => {
  it("200 — upserts learner settings (creates the row when none exists)", async () => {
    const u = track(await createTestUser());
    const res = await request(app)
      .patch("/api/v1/users/me/learner-profile")
      .set(auth(u.token))
      .send({ currentLevel: "B1", targetLevel: "C1", theme: "dark", weeklyGoalMinutes: 120 });
    expect(res.status).toBe(200);
    expect(res.body.data.currentLevel).toBe("B1");
    expect(res.body.data.targetLevel).toBe("C1");
    expect(res.body.data.theme).toBe("dark");
    expect(res.body.data.weeklyGoalMinutes).toBe(120);
  });

  it("200 — accepts a valid aiPersonality enum value", async () => {
    const u = track(await createTestUser());
    const res = await request(app)
      .patch("/api/v1/users/me/learner-profile")
      .set(auth(u.token))
      .send({ aiPersonality: "ENCOURAGING" });
    expect(res.status).toBe(200);
    expect(res.body.data.aiPersonality).toBe("ENCOURAGING");
  });

  it("422 — invalid CEFR level", async () => {
    const u = track(await createTestUser());
    const res = await request(app)
      .patch("/api/v1/users/me/learner-profile")
      .set(auth(u.token))
      .send({ currentLevel: "Z9" });
    expect(res.status).toBe(422);
  });

  it("422 — voiceSpeed out of range", async () => {
    const u = track(await createTestUser());
    const res = await request(app)
      .patch("/api/v1/users/me/learner-profile")
      .set(auth(u.token))
      .send({ voiceSpeed: 5 });
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app)
      .patch("/api/v1/users/me/learner-profile")
      .send({ currentLevel: "B1" });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/users/:id — admin get user by id", () => {
  it("200 — admin fetches a full user profile", async () => {
    const target = track(await createTestUser({ plan: "GOLD", status: "ACTIVE" }));
    const res = await request(app)
      .get(`/api/v1/users/${target.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(target.id);
    expect(res.body.data.subscription.plan).toBe("GOLD");
    expect(res.body.data.metrics).toBeDefined();
  });

  it("403 — a student cannot fetch another user by id", async () => {
    const target = track(await createTestUser());
    const res = await request(app)
      .get(`/api/v1/users/${target.id}`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it("404 — admin fetching a non-existent (but valid uuid) user", async () => {
    const res = await request(app)
      .get("/api/v1/users/00000000-0000-4000-8000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("422 — non-uuid id", async () => {
    const res = await request(app)
      .get("/api/v1/users/not-a-uuid")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/users/00000000-0000-4000-8000-000000000000");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("Internal user stealth (isInternal)", () => {
  let internal: TestUser;

  beforeAll(async () => {
    internal = track(await createTestUser({ role: "ADMIN", isInternal: true }));
  });

  it("internal user is absent from GET /users", async () => {
    const res = await request(app)
      .get("/api/v1/users?limit=100")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((u: { id: string }) => u.id);
    expect(ids).not.toContain(internal.id);
  });

  it("internal user is absent even when searched by its exact username", async () => {
    const res = await request(app)
      .get(`/api/v1/users?search=${internal.username}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
    expect(res.body.meta.total).toBe(0);
  });

  it("internal user is absent from the ?role=ADMIN filter", async () => {
    const res = await request(app)
      .get("/api/v1/users?role=ADMIN&limit=100")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((u: { id: string }) => u.id);
    expect(ids).not.toContain(internal.id);
  });

  it("GET /users/:id for an internal user returns 404 even to an admin", async () => {
    const res = await request(app)
      .get(`/api/v1/users/${internal.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  it("the internal user keeps full ADMIN access (can list users)", async () => {
    const res = await request(app).get("/api/v1/users").set(auth(internal.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("isInternal is never serialized in the user listing", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    for (const user of res.body.data) {
      expect(user).not.toHaveProperty("isInternal");
    }
  });
});
