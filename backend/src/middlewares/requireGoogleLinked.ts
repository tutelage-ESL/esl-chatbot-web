import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database.ts";
import { AppError } from "../utils/AppError.ts";

/**
 * Requires the authenticated user to have a Google account linked.
 * Must be used after the `authenticate` middleware.
 *
 * Usage:
 *   router.post("/sessions", authenticate, requireGoogleLinked, handler)
 */
export async function requireGoogleLinked(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { googleId: true },
  });

  if (!user?.googleId) {
    throw new AppError(
      "A linked Google account is required to access this feature. " +
        "Go to your account settings and connect your Google account.",
      403,
    );
  }

  next();
}
