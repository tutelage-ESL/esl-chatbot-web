import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.ts";
import { AppError } from "../utils/AppError.ts";
import type { JwtPayload } from "../modules/auth/auth.types.ts";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401);
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = {
      id: decoded.sub,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch {
    throw new AppError("Invalid or expired access token", 401);
  }
}
