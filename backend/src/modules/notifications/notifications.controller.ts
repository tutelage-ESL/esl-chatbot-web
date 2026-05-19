import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { AppError } from "../../utils/AppError.ts";
import { listNotificationsQuerySchema } from "./notifications.schema.ts";
import { listNotifications, markAllRead } from "./notifications.service.ts";

export const listNotificationsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const query = listNotificationsQuerySchema.parse(req.query);
  const { notifications, total } = await listNotifications(
    req.user.id,
    query.page,
    query.limit,
    query.read,
  );
  const meta = paginationMeta(total, query.page, query.limit);
  sendSuccess(res, notifications, "Notifications retrieved", 200, meta);
});

export const markAllReadHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  await markAllRead(req.user.id);
  sendSuccess(res, null, "All notifications marked as read");
});
