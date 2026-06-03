import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { AppError } from "../../utils/AppError.ts";
import { getDashboardOverview, getVocabGrowth } from "./dashboard.service.ts";
import type { VocabGrowthRange } from "./dashboard.types.ts";

export const getDashboardOverviewHandler = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Authentication required", 401);
    const data = await getDashboardOverview(req.user.id);
    sendSuccess(res, data, "Dashboard overview retrieved");
  },
);

export const getVocabGrowthHandler = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Authentication required", 401);
    const raw = (req.query.range as string | undefined) ?? "30d";
    const allowed: VocabGrowthRange[] = ["7d", "30d", "all"];
    const range: VocabGrowthRange = allowed.includes(raw as VocabGrowthRange)
      ? (raw as VocabGrowthRange)
      : "30d";
    const data = await getVocabGrowth(req.user.id, range);
    sendSuccess(res, data, "Vocabulary growth retrieved");
  },
);
