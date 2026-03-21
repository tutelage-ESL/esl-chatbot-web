import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.ts";
import { env } from "../../../config/env.ts";
import { prisma } from "../../../config/database.ts";

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

  // ── 400: Validation failures ──────────────────────────────────────────────

  describe("400 — Validation failures", () => {
    it("returns 400 when page is not a valid number", async () => {
      const res = await request(app)
        .get("/api/v1/users?page=abc")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 when limit exceeds the maximum of 100", async () => {
      const res = await request(app)
        .get("/api/v1/users?limit=999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
