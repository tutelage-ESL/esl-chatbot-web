import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { AppError } from "../../utils/AppError.ts";
import { liveSessionParamSchema, liveTurnSchema } from "./live.schema.ts";
import { saveLiveTurn, startLiveCall } from "./live.service.ts";

export const startLiveCallHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  sendSuccess(res, await startLiveCall(req.user.id), "Call ready", 201);
});

export const saveLiveTurnHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { sessionId } = liveSessionParamSchema.parse(req.params);
  const { user, tutor, audio } = liveTurnSchema.parse(req.body);
  sendSuccess(res, await saveLiveTurn(req.user.id, sessionId, user, tutor, audio), "Turn saved", 201);
});
