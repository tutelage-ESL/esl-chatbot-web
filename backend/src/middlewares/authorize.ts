import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import { AppError } from "../utils/AppError.ts";

/**
 * Role-based authorization guard factory.
 * Must be used after the `authenticate` middleware.
 *
 * Usage:
 *   router.get("/", authenticate, authorize("ADMIN"), handler)
 *   router.get("/", authenticate, authorize("ADMIN", "TUTOR"), handler)
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `Access denied. Required role: ${roles.join(" or ")}`,
        403,
      );
    }

    next();
  };
}
