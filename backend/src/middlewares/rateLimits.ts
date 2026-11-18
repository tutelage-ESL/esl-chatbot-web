import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";
import { env } from "../config/env.ts";
import { waitText } from "../utils/retryAfter.ts";

// Active in production only. In development and test, all limiters are no-ops.
// If you ever scale to multiple server processes, replace the default in-memory
// store with rate-limit-redis so all processes share quota state.
const skip = () => env.NODE_ENV !== "production";

// Per-user key for limiters that run AFTER authenticate. Falls back to the
// client IP for the rare unauthenticated case — routed through ipKeyGenerator
// so IPv6 addresses are normalised (raw req.ip lets IPv6 clients bypass limits).
const userOrIpKey = (req: Request) =>
  (req as any).user?.id ?? ipKeyGenerator(req.ip ?? "anonymous");

/**
 * 429 handler for one limiter: says what was limited and how long to wait, via the
 * `Retry-After` header (seconds), a `retryAfter` body field, and the message text.
 */
const limited = (what: string) => (req: Request, res: Response) => {
  const resetTime = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
  const retryAfter = Math.max(1, Math.ceil(((resetTime?.getTime() ?? Date.now() + 60_000) - Date.now()) / 1000));
  res.set("Retry-After", String(retryAfter));
  res.status(429).json({
    success: false,
    message: `${what} Please try again in ${waitText(retryAfter)}.`,
    data: null,
    retryAfter,
  });
};

// ── Auth endpoints — IP-based (fire before JWT auth) ──────────────────────────

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: limited("Too many sign-in attempts."),
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: limited("Too many sign-up attempts."),
});

export const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: limited("Too many Google sign-in attempts."),
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: limited("Too many password reset requests."),
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: limited("Too many password reset attempts."),
});

export const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: limited("Too many verification attempts."),
});

export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: limited("Too many verification code requests."),
});

export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: limited("Too many session refreshes."),
});

// ── AI endpoints — per-user (must be applied after authenticate middleware) ────
// keyGenerator uses req.user.id which authenticate sets before these limiters run.

export const createSessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  keyGenerator: userOrIpKey,
  handler: limited("You're starting sessions too quickly."),
});

export const sendMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  keyGenerator: userOrIpKey,
  handler: limited("You're sending messages too quickly."),
});

export const sendVoiceMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  keyGenerator: userOrIpKey,
  handler: limited("You're sending voice messages too quickly."),
});

// A live call saves a turn each time someone stops talking; quick back-and-forth runs
// well past the typed-message limit.
export const liveTurnLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  keyGenerator: userOrIpKey,
  handler: limited("You're talking faster than we can save. Please slow down a little."),
});

// ── User profile endpoints ─────────────────────────────────────────────────────

export const avatarUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  keyGenerator: userOrIpKey,
  handler: limited("Too many photo uploads."),
});

export const taskUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  keyGenerator: userOrIpKey,
  handler: limited("Too many file uploads."),
});

// ── Search — per-user (fans out to 5 DB queries per request) ──────────────────
// Keyed by user id (runs after authenticate). The header palette debounces at
// 250ms, so 30/min comfortably covers active typing while capping abuse.

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  keyGenerator: userOrIpKey,
  handler: limited("Too many searches."),
});

// ── Global fallback — last-resort DDoS protection ─────────────────────────────

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: limited("Too many requests."),
});
