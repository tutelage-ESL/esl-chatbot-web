import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import {
  getUsersQuerySchema,
  getUserParamSchema,
  updateMyProfileSchema,
  updateLearnerProfileSchema,
} from "./users.schema.ts";
import {
  getUsers,
  getUserById,
  getMyProfile,
  updateMyProfile,
  updateMyLearnerProfile,
  getDashboard,
} from "./users.service.ts";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = getUsersQuerySchema.parse(req.query);
  const { users, total } = await getUsers(
    query.page,
    query.limit,
    query.role,
    query.search,
    query.subscriptionStatus,
  );
  const meta = paginationMeta(total, query.page, query.limit);

  sendSuccess(res, users, "Users retrieved successfully", 200, meta);
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = getUserParamSchema.parse(req.params);
  const user = await getUserById(id);

  sendSuccess(res, user, "User retrieved successfully");
});

// ─── Self-profile ─────────────────────────────────────────────────────────────

export const getDashboardHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getDashboard(req.user!.id);
  sendSuccess(res, data, "Dashboard data retrieved successfully");
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getMyProfile(req.user!.id);
  sendSuccess(res, profile, "Profile retrieved successfully");
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const input = updateMyProfileSchema.parse(req.body);
  const profile = await updateMyProfile(req.user!.id, input);
  sendSuccess(res, profile, "Profile updated successfully");
});

export const updateLearnerProfile = asyncHandler(async (req: Request, res: Response) => {
  const input = updateLearnerProfileSchema.parse(req.body);
  const learnerProfile = await updateMyLearnerProfile(req.user!.id, input);
  sendSuccess(res, learnerProfile, "Learner profile updated successfully");
});
