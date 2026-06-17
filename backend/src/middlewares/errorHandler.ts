import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod/v4";
import multer from "multer";
import { AppError } from "../utils/AppError.ts";
import { logger } from "../config/logger.ts";
import { Sentry } from "../config/sentry.ts";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. Please check the size limit for this upload."
        : "File upload error";
    res.status(status).json({ success: false, message, data: null });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      // Extra flat fields (e.g. { needsAgreement: true }) are spread FIRST so the
      // canonical envelope keys below always win — details can add, never clobber.
      ...(err.details ?? {}),
      success: false,
      message: err.message,
      data: null,
    });
    return;
  }

  if (err instanceof ZodError) {
    // Build a field → first-error map for easy frontend field highlighting
    const errors: Record<string, string> = {};
    for (const issue of err.issues) {
      const field = issue.path.join(".") || "input";
      if (!errors[field]) errors[field] = issue.message;
    }
    const message = Object.entries(errors)
      .map(([field, msg]) => `${field}: ${msg}`)
      .join("; ");

    // 422 Unprocessable Entity — syntactically valid JSON but fails business validation
    res.status(422).json({
      success: false,
      message,
      data: null,
      errors,
    });
    return;
  }

  logger.error(err.stack ?? err.message);

  // Operational 4xx errors are filtered at the top — only genuine 500s reach here.
  // Attach the authenticated user if available so Sentry issues are searchable by user ID.
  Sentry.withScope((scope) => {
    if (req.user) {
      scope.setUser({ id: req.user.id, username: req.user.username });
    }
    scope.setContext("request", {
      method: req.method,
      url: req.url,
      userAgent: req.headers["user-agent"],
    });
    Sentry.captureException(err);
  });

  res.status(500).json({
    success: false,
    message: "Internal server error",
    data: null,
  });
}
