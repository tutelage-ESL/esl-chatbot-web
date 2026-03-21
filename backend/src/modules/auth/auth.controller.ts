import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { loginSchema, refreshSchema, logoutSchema } from "./auth.schema.ts";
import { login, refreshAccessToken, logout } from "./auth.service.ts";

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await login(input);

  sendSuccess(res, result, "Login successful", 200);
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await refreshAccessToken(refreshToken);

  sendSuccess(res, result, "Access token refreshed", 200);
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = logoutSchema.parse(req.body);
  await logout(refreshToken);

  sendSuccess(res, null, "Logged out successfully", 200);
});
