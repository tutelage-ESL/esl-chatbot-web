import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { AppError } from "../../utils/AppError.ts";
import {
  announcementParamSchema,
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
} from "./announcements.schema.ts";
import { listAnnouncements, createAnnouncement } from "./announcements.service.ts";

export const listAnnouncementsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = announcementParamSchema.parse(req.params);
  const query = listAnnouncementsQuerySchema.parse(req.query);
  const { announcements, total } = await listAnnouncements(
    id,
    req.user.id,
    req.user.role,
    query.page,
    query.limit,
  );
  const meta = paginationMeta(total, query.page, query.limit);
  sendSuccess(res, announcements, "Announcements retrieved", 200, meta);
});

export const createAnnouncementHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = announcementParamSchema.parse(req.params);
  const { content } = createAnnouncementSchema.parse(req.body);
  const announcement = await createAnnouncement(id, req.user.id, req.user.role, content);
  sendSuccess(res, announcement, "Announcement posted", 201);
});
