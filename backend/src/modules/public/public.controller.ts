import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { getPublicStats } from "./public.service.ts";

export const getPublicStatsHandler = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getPublicStats(), "Public stats retrieved");
});
