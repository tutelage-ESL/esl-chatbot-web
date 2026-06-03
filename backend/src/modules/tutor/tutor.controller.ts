import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { getTutorDashboardStats } from "./tutor.service.ts";

export const getTutorDashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const tutorId = req.user!.id;
  const data = await getTutorDashboardStats(tutorId);
  sendSuccess(res, data, "Tutor dashboard stats retrieved");
});
