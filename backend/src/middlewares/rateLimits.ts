import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { env } from "../config/env.ts";

// Active in production only. In development and test, all limiters are no-ops.
// If you ever scale to multiple server processes, replace the default in-memory
// store with rate-limit-redis so all processes share quota state.
const skip = () => env.NODE_ENV !== "production";

const jsonHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please wait and try again.",
    data: null,
  });
};

// ── Auth endpoints — IP-based (fire before JWT auth) ──────────────────────────

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: jsonHandler,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: jsonHandler,
});

export const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: jsonHandler,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: jsonHandler,
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: jsonHandler,
});

export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: jsonHandler,
});

// ── AI endpoints — per-user (must be applied after authenticate middleware) ────
// keyGenerator uses req.user.id which authenticate sets before these limiters run.

export const createSessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  keyGenerator: (req: Request) => (req as any).user?.id ?? req.ip ?? "anonymous",
  handler: jsonHandler,
});

export const sendMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  keyGenerator: (req: Request) => (req as any).user?.id ?? req.ip ?? "anonymous",
  handler: jsonHandler,
});

export const sendVoiceMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  keyGenerator: (req: Request) => (req as any).user?.id ?? req.ip ?? "anonymous",
  handler: jsonHandler,
});

// ── Global fallback — last-resort DDoS protection ─────────────────────────────

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip,
  handler: jsonHandler,
});
