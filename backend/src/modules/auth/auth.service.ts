import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { prisma } from "../../config/database.ts";
import { env } from "../../config/env.ts";
import { AppError } from "../../utils/AppError.ts";
import type { LoginInput, LoginResponse, JwtPayload } from "./auth.types.ts";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const INVALID_CREDENTIALS_MSG = "Invalid username or password";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  } as jwt.SignOptions);
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  } as jwt.SignOptions);
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
    include: {
      subscription: { select: { plan: true, status: true } },
    },
  });

  // Same error for "not found" and "wrong password" — prevents username enumeration
  if (!user) {
    throw new AppError(INVALID_CREDENTIALS_MSG, 401);
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated. Please contact support.", 403);
  }

  const passwordValid = await bcryptjs.compare(input.password, user.password);
  if (!passwordValid) {
    throw new AppError(INVALID_CREDENTIALS_MSG, 401);
  }

  const jwtPayload: JwtPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  const accessToken = signAccessToken(jwtPayload);
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      subscription: user.subscription
        ? { plan: user.subscription.plan, status: user.subscription.status }
        : null,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  // Verify signature first
  try {
    jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, username: true, email: true, role: true, isActive: true } },
    },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  if (!stored.user.isActive) {
    throw new AppError("Your account has been deactivated. Please contact support.", 403);
  }

  const jwtPayload: JwtPayload = {
    sub: stored.user.id,
    username: stored.user.username,
    email: stored.user.email,
    role: stored.user.role,
  };

  return { accessToken: signAccessToken(jwtPayload) };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}
