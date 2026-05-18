import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { listProgressQuerySchema, summaryQuerySchema } from "./progress.schema.ts";
import { listProgress, getTodayProgress, getProgressSummary } from "./progress.service.ts";

export const listProgressHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = listProgressQuerySchema.parse(req.query);
  const { entries, total } = await listProgress(
    req.user!.id,
    query.page,
    query.limit,
    query.startDate,
    query.endDate,
  );
  const meta = paginationMeta(total, query.page, query.limit);
  sendSuccess(res, entries, "Progress retrieved successfully", 200, meta);
});

export const getTodayProgressHandler = asyncHandler(async (req: Request, res: Response) => {
  const entry = await getTodayProgress(req.user!.id);
  sendSuccess(res, entry, "Today's progress retrieved successfully");
});

export const getProgressSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const { days } = summaryQuerySchema.parse(req.query);
  const summary = await getProgressSummary(req.user!.id, days);
  sendSuccess(res, summary, "Progress summary retrieved successfully");
});
