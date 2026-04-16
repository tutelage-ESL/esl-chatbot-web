import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import {
  loginSchema,
  registerSchema,
  googleAuthSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  linkGoogleSchema,
  setPasswordSchema,
} from "./auth.schema.ts";
import {
  login,
  register,
  googleAuth,
  refreshAccessToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  linkGoogle,
  setPassword,
} from "./auth.service.ts";
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

export const forgotPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = forgotPasswordSchema.parse(req.body);
  await forgotPassword(input);

  // Always return the same message — do not reveal whether the email exists
  sendSuccess(res, null, "If that email is registered, you will receive a reset code shortly", 200);
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = resetPasswordSchema.parse(req.body);
  await resetPassword(input);

  sendSuccess(res, null, "Password reset successfully. You can now log in with your new password.", 200);
});

export const linkGoogleHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const input = linkGoogleSchema.parse(req.body);
  const user = await linkGoogle(req.user.id, input);

  sendSuccess(res, user, "Google account linked successfully", 200);
});

export const setPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const input = setPasswordSchema.parse(req.body);
  await setPassword(req.user.id, input);

  sendSuccess(res, null, "Password set successfully. You can now log in with your email and password.", 200);
});
