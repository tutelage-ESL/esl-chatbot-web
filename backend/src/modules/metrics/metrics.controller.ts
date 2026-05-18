import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { userIdParamSchema } from "./metrics.schema.ts";
import { getMyMetrics, getStudentMetrics } from "./metrics.service.ts";

export const getMyMetricsHandler = asyncHandler(async (req: Request, res: Response) => {
  const metrics = await getMyMetrics(req.user!.id);
  sendSuccess(res, metrics, "Metrics retrieved successfully");
});

export const getStudentMetricsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const metrics = await getStudentMetrics(userId, req.user!.id, req.user!.role);
  sendSuccess(res, metrics, "Student metrics retrieved successfully");
});
