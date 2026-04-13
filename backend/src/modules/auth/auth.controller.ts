import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { loginSchema, registerSchema, googleAuthSchema, refreshSchema, logoutSchema } from "./auth.schema.ts";
import { login, register, googleAuth, refreshAccessToken, logout, getMe } from "./auth.service.ts";
import { AppError } from "../../utils/AppError.ts";

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await login(input);

  sendSuccess(res, result, "Login successful", 200);
});

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const result = await register(input);

  sendSuccess(res, result, "Registration successful", 201);
});

export const googleAuthHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = googleAuthSchema.parse(req.body);
  const result = await googleAuth(input);

  if (result.needsRegistration) {
    // 200 with needsRegistration: true — frontend should show username input
    sendSuccess(res, result, "Username required to complete registration", 200);
  } else {
    sendSuccess(res, result, "Google authentication successful", 200);
  }
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await refreshAccessToken(refreshToken);

  sendSuccess(res, result, "Access token refreshed", 200);
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const user = await getMe(req.user.id);

  sendSuccess(res, user, "Current user", 200);
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = logoutSchema.parse(req.body);
  await logout(refreshToken);

  sendSuccess(res, null, "Logged out successfully", 200);
});
