import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import bcryptjs from "bcryptjs";
import {
  app,
  request,
  SEED,
  login,
  signAccess,
  signRefresh,
  expiredToken,
  wrongSecretToken,
  uniqueId,
} from "../../../test/helpers.ts";
import { prisma } from "../../../config/database.ts";

// ─── Fixtures created directly in the DB for states unreachable via the API ───
// (a Google-only account has no password; a deactivated account can't be made
// through register). All tracked and deleted in afterAll — cascade removes
// owned rows (profile/subscription/metrics/refresh tokens).

const createdUserIds: string[] = [];

let googleOnlyUserId: string;
let inactiveUserId: string;
const NONEXISTENT_USER_ID = "00000000-0000-0000-0000-000000000abc";

beforeAll(async () => {
  const uid = uniqueId();
  const pw = await bcryptjs.hash("password123", 10);

  const googleUser = await prisma.user.create({
    data: {
      username: `gonly_${uid}`,
      email: `gonly_${uid}@tutelage.test`,
      displayName: "Google Only",
      authProvider: "GOOGLE",
      googleId: `gid_${uid}`,
      // password intentionally omitted → null
    },
  });
  googleOnlyUserId = googleUser.id;
  createdUserIds.push(googleUser.id);

  const inactiveUser = await prisma.user.create({
    data: {
      username: `inact_${uid}`,
      email: `inact_${uid}@tutelage.test`,
      displayName: "Inactive User",
      authProvider: "LOCAL",
      password: pw,
      isActive: false,
    },
  });
  inactiveUserId = inactiveUser.id;
  createdUserIds.push(inactiveUser.id);
});

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe("POST /api/v1/auth/login", () => {
  it("200 — logs in a seeded user and returns tokens + user", async () => {
    const res = await request(app).post("/api/v1/auth/login").send(SEED.ali);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Login successful");
    expect(typeof res.body.data.accessToken).toBe("string");
    expect(typeof res.body.data.refreshToken).toBe("string");
    expect(res.body.data.user.username).toBe("student_ali");
    expect(res.body.data.user.subscription).toEqual({ plan: "PREMIUM", status: "ACTIVE" });
    // Password must never leak
    expect(res.body.data.user).not.toHaveProperty("password");
  });

  it("400 — wrong password (generic message to prevent enumeration)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: SEED.ali.username, password: "wrong-password" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid username or password");
  });

  it("400 — nonexistent username (same generic message)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "no_such_user_xyz", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid username or password");
  });

  it("400 — Google-only account is told to use Google Sign-In", async () => {
    const user = await prisma.user.findUnique({ where: { id: googleOnlyUserId } });
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: user!.username, password: "anything" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Google Sign-In");
  });

  it("403 — deactivated account is blocked before password check", async () => {
    const user = await prisma.user.findUnique({ where: { id: inactiveUserId } });
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: user!.username, password: "password123" });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("deactivated");
  });

  it("422 — missing password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ username: "x" });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });
});

// ─── POST /auth/register ──────────────────────────────────────────────────────

describe("POST /api/v1/auth/register", () => {
  it("201 — creates a FREE/INACTIVE account with profile, subscription and metrics", async () => {
    const uid = uniqueId();
    const body = {
      username: `newuser_${uid}`,
      email: `newuser_${uid}@tutelage.test`,
      password: "password123",
      displayName: "New User",
    };

    const res = await request(app).post("/api/v1/auth/register").send(body);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.subscription).toEqual({ plan: "FREE", status: "INACTIVE" });
    expect(typeof res.body.data.accessToken).toBe("string");

    const newId: string = res.body.data.user.id;
    createdUserIds.push(newId);

    // Verify the transaction created all four rows
    const [profile, subscription, metrics] = await Promise.all([
      prisma.learnerProfile.findUnique({ where: { userId: newId } }),
      prisma.subscription.findUnique({ where: { userId: newId } }),
      prisma.userMetrics.findUnique({ where: { userId: newId } }),
    ]);
    expect(profile).not.toBeNull();
    expect(subscription?.status).toBe("INACTIVE");
    expect(metrics).not.toBeNull();
  });

  it("409 — duplicate username", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      username: SEED.admin.username, // already taken
      email: `dup_${uniqueId()}@tutelage.test`,
      password: "password123",
      displayName: "Dup",
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Username is already taken");
  });

  it("409 — duplicate email", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      username: `unique_${uniqueId()}`,
      email: "ali@tutelage.com", // seeded email
      password: "password123",
      displayName: "Dup Email",
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Email is already registered");
  });

  it("422 — password too short / username invalid / email malformed", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      username: "ab", // too short + ok chars
      email: "not-an-email",
      password: "short",
      displayName: "",
    });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

describe("GET /api/v1/auth/me", () => {
  it("200 — returns the current user for a valid token", async () => {
    const { accessToken } = await login(SEED.yuki);
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe("student_yuki");
    expect(res.body.data.subscription).toEqual({ plan: "FREE", status: "ACTIVE" });
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("401 — expired token", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${expiredToken()}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired access token");
  });

  it("401 — token signed with the wrong secret", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${wrongSecretToken()}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired access token");
  });

  it("403 — token is valid but the account was deactivated after issuance", async () => {
    const token = signAccess({ sub: inactiveUserId, role: "STUDENT" });
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("deactivated");
  });

  it("404 — token is valid but the user no longer exists", async () => {
    const token = signAccess({ sub: NONEXISTENT_USER_ID, role: "ADMIN" });
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found");
  });
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

describe("POST /api/v1/auth/refresh", () => {
  it("200 — exchanges a stored refresh token for a fresh access token", async () => {
    const { refreshToken } = await login(SEED.admin);
    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.accessToken).toBe("string");
  });

  it("401 — malformed refresh token", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: "not.a.jwt" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired refresh token");
  });

  it("401 — correctly signed but never stored server-side", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: signRefresh(NONEXISTENT_USER_ID) });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired refresh token");
  });

  it("422 — missing refreshToken", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({});
    expect(res.status).toBe(422);
  });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

describe("POST /api/v1/auth/logout", () => {
  it("200 — revokes the refresh token (subsequent refresh fails)", async () => {
    const { refreshToken } = await login(SEED.tutor);

    const logoutRes = await request(app).post("/api/v1/auth/logout").send({ refreshToken });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // The revoked token can no longer be refreshed — proves server-side revocation
    const refreshRes = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  it("200 — unknown token is a no-op (does not error)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: signRefresh(NONEXISTENT_USER_ID) });
    expect(res.status).toBe(200);
  });

  it("422 — missing refreshToken", async () => {
    const res = await request(app).post("/api/v1/auth/logout").send({});
    expect(res.status).toBe(422);
  });
});

// ─── POST /auth/set-password (authenticated) ──────────────────────────────────

describe("POST /api/v1/auth/set-password", () => {
  it("401 — requires authentication", async () => {
    const res = await request(app).post("/api/v1/auth/set-password").send({ newPassword: "password123" });
    expect(res.status).toBe(401);
  });

  it("422 — password too short", async () => {
    const { accessToken } = await login(SEED.yuki);
    const res = await request(app)
      .post("/api/v1/auth/set-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ newPassword: "short" });
    expect(res.status).toBe(422);
  });

  it("409 — account already has a password", async () => {
    const { accessToken } = await login(SEED.ali);
    const res = await request(app)
      .post("/api/v1/auth/set-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ newPassword: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("already has a password");
  });

  it("200 — Google-only account can set a password", async () => {
    const token = signAccess({ sub: googleOnlyUserId, role: "STUDENT" });
    const res = await request(app)
      .post("/api/v1/auth/set-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ newPassword: "brandNewPass123" });

    expect(res.status).toBe(200);
    const user = await prisma.user.findUnique({ where: { id: googleOnlyUserId }, select: { password: true } });
    expect(user?.password).toBeTruthy();
  });
});

// ─── POST /auth/link-google (authenticated) — validation only ─────────────────
// The success path verifies a real Google ID token (network + GOOGLE_CLIENT_ID),
// which is non-deterministic in CI, so we assert only the deterministic guards.

describe("POST /api/v1/auth/link-google", () => {
  it("401 — requires authentication", async () => {
    const res = await request(app).post("/api/v1/auth/link-google").send({ idToken: "x" });
    expect(res.status).toBe(401);
  });

  it("422 — missing idToken", async () => {
    const { accessToken } = await login(SEED.yuki);
    const res = await request(app)
      .post("/api/v1/auth/link-google")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});
    expect(res.status).toBe(422);
  });
});

// ─── Validation-only coverage for email/Google endpoints ──────────────────────
// (success paths depend on Resend / Google config that may be absent in CI)

describe("POST /api/v1/auth/forgot-password & /google — validation", () => {
  it("422 — forgot-password with malformed email", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: "nope" });
    expect(res.status).toBe(422);
  });

  it("422 — reset-password with bad OTP shape", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ email: "x@y.com", otp: "12", newPassword: "password123" });
    expect(res.status).toBe(422);
  });

  it("422 — google auth with missing idToken", async () => {
    const res = await request(app).post("/api/v1/auth/google").send({});
    expect(res.status).toBe(422);
  });
});
