/**
 * Shared integration-test helpers. Import `app` and these utilities from here so
 * every test file drives the same Express instance with consistent token logic.
 *
 * NOTE: `app` (and therefore env.ts / database.ts) is imported here, which is why
 * src/test/setup.ts must run first (preload) to redirect DATABASE_URL beforehand.
 */
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Plan, Role, SubStatus, PaymentProvider, Prisma } from "@prisma/client";
import app from "../app.ts";
import { env } from "../config/env.ts";
import { prisma } from "../config/database.ts";

export { app, request, prisma };

/** Seed users from prisma/seed.ts — all share password `password123`. */
export const SEED = {
  admin: { username: "admin_main", password: "password123" }, // role ADMIN, FREE ACTIVE
  tutor: { username: "tutor_sarah", password: "password123" }, // role TUTOR, FREE ACTIVE
  ali: { username: "student_ali", password: "password123" }, //  role STUDENT, PREMIUM ACTIVE
  yuki: { username: "student_yuki", password: "password123" }, // role STUDENT, FREE ACTIVE
} as const;

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    role: "STUDENT" | "TUTOR" | "ADMIN";
    subscription: { plan: string; status: string } | null;
  };
}

/** Logs in via the real endpoint — exercises the full auth flow, not just middleware. */
export async function login(creds: { username: string; password: string }): Promise<LoginResult> {
  const res = await request(app).post("/api/v1/auth/login").send(creds);
  if (res.status !== 200) {
    throw new Error(
      `login(${creds.username}) failed (${res.status}): ${res.body?.message}. ` +
        "Is the test DB running and seeded? Run `bun run test:setup`.",
    );
  }
  return res.body.data;
}

export async function tokenFor(creds: { username: string; password: string }): Promise<string> {
  return (await login(creds)).accessToken;
}

// ── Crafted tokens for edge cases that cannot be obtained through normal login ──

/** Access token signed with the correct secret for an arbitrary user/role. */
export function signAccess(payload: {
  sub: string;
  username?: string;
  email?: string;
  role?: "STUDENT" | "TUTOR" | "ADMIN";
}): string {
  return jwt.sign(
    { username: "test_user", email: "test@tutelage.com", role: "STUDENT", ...payload },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" } as jwt.SignOptions,
  );
}

/** Refresh token signed with the correct secret (but not stored server-side). */
export function signRefresh(sub: string): string {
  return jwt.sign({ sub }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" } as jwt.SignOptions);
}

/** Correctly-signed but already-expired access token. */
export function expiredToken(): string {
  return jwt.sign(
    {
      sub: "00000000-0000-0000-0000-000000000099",
      username: "test_user",
      email: "test@tutelage.com",
      role: "ADMIN",
      exp: Math.floor(Date.now() / 1000) - 3600,
    },
    env.JWT_ACCESS_SECRET,
  );
}

/** Structurally-valid token signed with the wrong secret. */
export function wrongSecretToken(): string {
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

/** Random, collision-safe suffix for usernames/emails created during a test run. */
export function uniqueId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── DB fixtures ─────────────────────────────────────────────────────────────
// Create fully-formed, self-contained users with precise subscription/metrics
// state so mutation tests never touch the shared seed users. Deleting the user
// cascades to all owned rows (sessions, messages, evaluations, progress, etc.),
// so cleanup is a single deleteTestUsers(ids) call in afterAll.

export interface CreateTestUserOptions {
  role?: Role;
  /** Subscription plan. Pass `null` to create NO subscription row (for the 403 "no sub" path). */
  plan?: Plan | null;
  status?: SubStatus;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  paymentProvider?: PaymentProvider | null;
  isActive?: boolean;
  /** Stealth internal account — hidden from listings/dashboards/class lists. */
  isInternal?: boolean;
  /** Overrides for the UserMetrics row (streak, skills, lastStudyDate, …). */
  metrics?: Omit<Prisma.UserMetricsUncheckedCreateInput, "userId">;
}

export interface TestUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  /** Valid access token for this user (minted directly — authenticate is stateless). */
  token: string;
}

/**
 * Creates a User (+ Subscription unless `plan: null` + UserMetrics) and returns a
 * ready-to-use access token. Tokens are signed, not obtained via login, so no
 * password/bcrypt round-trip is needed — `authenticate` trusts the token claims.
 */
export async function createTestUser(opts: CreateTestUserOptions = {}): Promise<TestUser> {
  const role = opts.role ?? "STUDENT";
  const suffix = uniqueId();
  const username = `test_${suffix}`;
  const email = `${username}@tutelage.com`;

  const user = await prisma.user.create({
    data: {
      username,
      email,
      displayName: "Test User",
      // Never used for login in tests (we mint tokens directly), but valid shape.
      password: "$2a$12$testplaceholderhashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authProvider: "LOCAL",
      role,
      isActive: opts.isActive ?? true,
      isInternal: opts.isInternal ?? false,
    },
    select: { id: true },
  });

  if (opts.plan !== null) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: opts.plan ?? "FREE",
        status: opts.status ?? "ACTIVE",
        currentPeriodStart: opts.currentPeriodStart ?? null,
        currentPeriodEnd: opts.currentPeriodEnd ?? null,
        paymentProvider: opts.paymentProvider ?? null,
      },
    });
  }

  await prisma.userMetrics.create({
    data: { userId: user.id, ...opts.metrics },
  });

  const token = signAccess({ sub: user.id, username, email, role });
  return { id: user.id, username, email, role, token };
}

/** Deletes users by id (cascade removes all owned rows). Safe to call with unknown ids. */
export async function deleteTestUsers(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
