import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomInt } from "crypto";
import { prisma } from "../../config/database.ts";
import { env } from "../../config/env.ts";
import { AppError } from "../../utils/AppError.ts";
import type {
  AuthUser,
  LoginInput,
  LoginResponse,
  RegisterInput,
  GoogleAuthInput,
  GoogleAuthResponse,
  GoogleProfile,
  JwtPayload,
  ForgotPasswordInput,
  ResetPasswordInput,
  LinkGoogleInput,
  SetPasswordInput,
} from "./auth.types.ts";
import { resend } from "../../config/resend.ts";

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

async function issueTokenPair(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken, refreshToken };
}

/**
 * Verify a Google ID token via Google's tokeninfo endpoint.
 * Returns the decoded profile on success, throws AppError(401) on failure.
 */
async function verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError("Google OAuth is not configured on this server", 503);
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (!response.ok) {
    throw new AppError("Invalid Google ID token", 401);
  }

  const payload = await response.json() as Record<string, string>;

  // Ensure token was issued for THIS application
  if (payload["aud"] !== env.GOOGLE_CLIENT_ID) {
    throw new AppError("Google token was not issued for this application", 401);
  }

  // Ensure email is verified on the Google account
  if (payload["email_verified"] !== "true") {
    throw new AppError("Google account email is not verified", 401);
  }

  return {
    googleId: payload["sub"] ?? "",
    email: payload["email"] ?? "",
    displayName: payload["name"] ?? payload["email"] ?? "",
    avatarUrl: payload["picture"] ?? null,
  };
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(input: LoginInput): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
    include: {
      subscription: { select: { plan: true, status: true } },
    },
  });

  // Same error for "not found" and "wrong password" — prevents username enumeration
  if (!user) {
    throw new AppError(INVALID_CREDENTIALS_MSG, 400);
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated. Please contact support.", 403);
  }

  // Google-only account: no password stored, must use Google sign-in
  if (!user.password) {
    throw new AppError(
      "This account was created with Google Sign-In. Please use the 'Sign in with Google' option.",
      400
    );
  }

  const passwordValid = await bcryptjs.compare(input.password, user.password);
  if (!passwordValid) {
    throw new AppError(INVALID_CREDENTIALS_MSG, 400);
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

// ─── Register ────────────────────────────────────────────────────────────────

export async function register(input: RegisterInput): Promise<LoginResponse> {
  // Check uniqueness before the transaction to give a clear error message
  const existingByUsername = await prisma.user.findUnique({ where: { username: input.username } });
  if (existingByUsername) throw new AppError("Username is already taken", 409);

  const existingByEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingByEmail) throw new AppError("Email is already registered", 409);

  const hashedPassword = await bcryptjs.hash(input.password, 12);

  // Create User + LearnerProfile + Subscription (FREE/INACTIVE) + UserMetrics atomically
  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: input.username,
        email: input.email,
        password: hashedPassword,
        displayName: input.displayName,
        authProvider: "LOCAL",
      },
    });

    await tx.learnerProfile.create({ data: { userId: user.id } });

    // INACTIVE until the user purchases a subscription
    await tx.subscription.create({
      data: { userId: user.id, plan: "FREE", status: "INACTIVE" },
    });

    await tx.userMetrics.create({ data: { userId: user.id } });

    return user;
  });

  const { accessToken, refreshToken } = await issueTokenPair(newUser.id);

  return {
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      displayName: newUser.displayName,
      role: newUser.role,
      avatarUrl: newUser.avatarUrl,
      isActive: newUser.isActive,
      // We know exactly what was just created
      subscription: { plan: "FREE", status: "INACTIVE" },
    },
    accessToken,
    refreshToken,
  };
}

// ─── Google Auth ─────────────────────────────────────────────────────────────

export async function googleAuth(input: GoogleAuthInput): Promise<GoogleAuthResponse> {
  const profile = await verifyGoogleToken(input.idToken);

  // Case A: existing Google user — direct login
  let user = await prisma.user.findUnique({
    where: { googleId: profile.googleId },
    include: { subscription: { select: { plan: true, status: true } } },
  });

  // Case B: existing LOCAL user with same email — merge (link Google to their account)
  if (!user) {
    const localUser = await prisma.user.findUnique({
      where: { email: profile.email },
      include: { subscription: { select: { plan: true, status: true } } },
    });

    if (localUser) {
      user = await prisma.user.update({
        where: { id: localUser.id },
        data: {
          googleId: profile.googleId,
          // Only update avatar if they don't already have one
          avatarUrl: localUser.avatarUrl ?? profile.avatarUrl,
        },
        include: { subscription: { select: { plan: true, status: true } } },
      });
    }
  }

  // Case C/D: brand new Google user
  if (!user) {
    // Need a username before we can create the account
    if (!input.username) {
      // Tell the frontend to show a username input, then call this endpoint again with username
      return {
        needsRegistration: true,
        profile,
      };
    }

    const usernameExists = await prisma.user.findUnique({ where: { username: input.username } });
    if (usernameExists) throw new AppError("Username is already taken", 409);

    // Create User + LearnerProfile + Subscription (FREE/INACTIVE) + UserMetrics atomically
    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: input.username!,
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          authProvider: "GOOGLE",
          googleId: profile.googleId,
          // password intentionally omitted — Google users have no password
        },
      });

      await tx.learnerProfile.create({ data: { userId: newUser.id } });
      await tx.subscription.create({
        data: { userId: newUser.id, plan: "FREE", status: "INACTIVE" },
      });
      await tx.userMetrics.create({ data: { userId: newUser.id } });

      return newUser;
    });

    const { accessToken, refreshToken } = await issueTokenPair(created.id);

    return {
      needsRegistration: false,
      user: {
        id: created.id,
        username: created.username,
        email: created.email,
        displayName: created.displayName,
        role: created.role,
        avatarUrl: created.avatarUrl,
        isActive: created.isActive,
        subscription: { plan: "FREE", status: "INACTIVE" },
      },
      accessToken,
      refreshToken,
    };
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated. Please contact support.", 403);
  }

  const { accessToken, refreshToken } = await issueTokenPair(user.id);

  return {
    needsRegistration: false,
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

// ─── Token refresh & logout ───────────────────────────────────────────────────

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

// ─── Current user (GET /auth/me) ──────────────────────────────────────────────

export async function getMe(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: { select: { plan: true, status: true } } },
  });

  // Token was valid but the user no longer exists (deleted account)
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated. Please contact support.", 403);
  }

  return {
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
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

// ─── Forgot password (send OTP) ───────────────────────────────────────────────

function generateOtp(): string {
  // 6-digit numeric OTP — uses CSPRNG (crypto.randomInt), not Math.random()
  return String(randomInt(100000, 1000000));
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  if (!resend || !env.RESEND_API_KEY) {
    throw new AppError("Email service is not configured on this server", 503);
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, displayName: true, password: true, authProvider: true },
  });

  // Never reveal whether an email exists — respond the same way regardless
  if (!user) return;

  // Google-only accounts have no password — direct them to Google login
  if (!user.password) {
    await resend.emails.send({
      from: env.EMAIL_FROM ?? "noreply@resend.dev",
      to: input.email,
      subject: "Tutelage — Password reset not available",
      html: `
        <p>Hi ${user.displayName},</p>
        <p>Your Tutelage account was created with Google Sign-In and does not have a password.</p>
        <p>Simply use the <strong>"Sign in with Google"</strong> button to access your account — no password needed.</p>
        <p>If you'd like to set a password so you can also log in with email, you can do so from your account settings after signing in.</p>
        <p>— The Tutelage Team</p>
      `,
    });
    return;
  }

  const otp = generateOtp();
  const otpHash = hashToken(otp);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Invalidate any previous unused OTPs for this user, then create a fresh one
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, otpHash, expiresAt } }),
  ]);

  await resend.emails.send({
    from: env.EMAIL_FROM ?? "noreply@resend.dev",
    to: input.email,
    subject: "Tutelage — Your password reset code",
    html: `
      <p>Hi ${user.displayName},</p>
      <p>Use the following code to reset your Tutelage password. It expires in <strong>15 minutes</strong>.</p>
      <h2 style="letter-spacing: 8px; font-size: 36px;">${otp}</h2>
      <p>If you did not request this, you can safely ignore this email.</p>
      <p>— The Tutelage Team</p>
    `,
  });
}

// ─── Reset password (verify OTP + set new password) ───────────────────────────

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, password: true },
  });

  if (!user) {
    throw new AppError("Invalid or expired reset code", 400);
  }

  if (!user.password) {
    throw new AppError(
      "This account uses Google Sign-In. Use 'Sign in with Google' to access your account.",
      400,
    );
  }

  const otpHash = hashToken(input.otp);
  const record = await prisma.passwordResetToken.findUnique({
    where: { otpHash },
  });

  if (!record || record.userId !== user.id) {
    throw new AppError("Invalid or expired reset code", 400);
  }

  if (record.usedAt) {
    throw new AppError("This reset code has already been used", 400);
  }

  if (record.expiresAt < new Date()) {
    throw new AppError("Reset code has expired. Please request a new one.", 400);
  }

  const hashedPassword = await bcryptjs.hash(input.newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } }),
    prisma.passwordResetToken.update({ where: { otpHash }, data: { usedAt: new Date() } }),
  ]);
}

// ─── Link Google to an existing account ──────────────────────────────────────

export async function linkGoogle(userId: string, input: LinkGoogleInput): Promise<AuthUser> {
  const profile = await verifyGoogleToken(input.idToken);

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleId: true },
  });

  if (!currentUser) throw new AppError("User not found", 404);

  if (currentUser.googleId) {
    throw new AppError("A Google account is already linked to your profile", 409);
  }

  // Ensure this Google account isn't already linked to a different user
  const existingGoogleUser = await prisma.user.findUnique({
    where: { googleId: profile.googleId },
  });
  if (existingGoogleUser) {
    throw new AppError("This Google account is already linked to a different user", 409);
  }

  // Read current avatar before updating so we can preserve it if already set
  const existing = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      googleId: profile.googleId,
      avatarUrl: existing.avatarUrl ?? profile.avatarUrl,
    },
    include: { subscription: { select: { plan: true, status: true } } },
  });

  return {
    id: updated.id,
    username: updated.username,
    email: updated.email,
    displayName: updated.displayName,
    role: updated.role,
    avatarUrl: updated.avatarUrl,
    isActive: updated.isActive,
    subscription: updated.subscription
      ? { plan: updated.subscription.plan, status: updated.subscription.status }
      : null,
  };
}

// ─── Set password (for Google-only accounts) ─────────────────────────────────

export async function setPassword(userId: string, input: SetPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) throw new AppError("User not found", 404);

  if (user.password) {
    throw new AppError(
      "Your account already has a password. Use the forgot-password flow to change it.",
      409,
    );
  }

  const hashedPassword = await bcryptjs.hash(input.newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
}
