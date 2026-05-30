import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { AppError } from "../../utils/AppError.ts";
import { getDashboardOverview } from "./dashboard.service.ts";

export const getDashboardOverviewHandler = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Authentication required", 401);
    const data = await getDashboardOverview(req.user.id);
    sendSuccess(res, data, "Dashboard overview retrieved");
  },
);
