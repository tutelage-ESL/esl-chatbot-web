import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.ts";
import { logger } from "../config/logger.ts";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: null,
    });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
      .join("; ");
    res.status(400).json({
      success: false,
      message,
      data: null,
    });
    return;
  }

  logger.error(err.stack ?? err.message);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    data: null,
  });
}
