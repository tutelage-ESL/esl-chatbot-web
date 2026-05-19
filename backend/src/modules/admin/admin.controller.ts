import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import {
  updateUserBodySchema,
  assignSubscriptionBodySchema,
  adminUserParamSchema,
} from "./admin.schema.ts";
import {
  updateUser,
  assignSubscription,
  cancelSubscription,
  getAdminDashboardStats,
} from "./admin.service.ts";

export const patchUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = adminUserParamSchema.parse(req.params);
  const body = updateUserBodySchema.parse(req.body);
  const user = await updateUser(id, body);
  sendSuccess(res, user, "User updated successfully");
});

export const putSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { id } = adminUserParamSchema.parse(req.params);
  const body = assignSubscriptionBodySchema.parse(req.body);
  const sub = await assignSubscription(id, body);
  sendSuccess(res, sub, "Subscription assigned successfully");
});

export const deleteSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { id } = adminUserParamSchema.parse(req.params);
  await cancelSubscription(id);
  sendSuccess(res, null, "Subscription cancelled successfully");
});

export const getDashboardHandler = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getAdminDashboardStats();
  sendSuccess(res, data, "Dashboard stats retrieved");
});
