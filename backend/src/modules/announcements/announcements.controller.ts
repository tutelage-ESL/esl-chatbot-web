import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { AppError } from "../../utils/AppError.ts";
import type { UploadedFile } from "../tasks/tasks.files.ts";
import {
  announcementParamSchema,
  announcementIdParamSchema,
  announcementCommentParamSchema,
  announcementAttachmentParamSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementCommentSchema,
  listAnnouncementsQuerySchema,
  listAnnouncementCommentsQuerySchema,
} from "./announcements.schema.ts";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  addAnnouncementFiles,
  deleteAnnouncementFile,
  getAnnouncementFileDownload,
} from "./announcements.service.ts";
import {
  listAnnouncementComments,
  createAnnouncementComment,
  updateAnnouncementComment,
  deleteAnnouncementComment,
} from "./announcements.comments.service.ts";

const filesOf = (req: Request): UploadedFile[] => (Array.isArray(req.files) ? req.files : []);

function actor(req: Request) {
  if (!req.user) throw new AppError("Authentication required", 401);
  return req.user;
}

export const listAnnouncementsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id } = announcementParamSchema.parse(req.params);
  const query = listAnnouncementsQuerySchema.parse(req.query);
  const { announcements, total } = await listAnnouncements(id, user.id, user.role, query.page, query.limit);
  sendSuccess(res, announcements, "Announcements retrieved", 200, paginationMeta(total, query.page, query.limit));
});

export const createAnnouncementHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id } = announcementParamSchema.parse(req.params);
  const { content } = createAnnouncementSchema.parse(req.body ?? {});
  const announcement = await createAnnouncement(id, user.id, user.role, content, filesOf(req));
  sendSuccess(res, announcement, "Announcement posted", 201);
});

export const updateAnnouncementHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id, announcementId } = announcementIdParamSchema.parse(req.params);
  const body = updateAnnouncementSchema.parse(req.body ?? {});
  const announcement = await updateAnnouncement(id, announcementId, user.id, user.role, body);
  sendSuccess(res, announcement, "Announcement updated");
});

export const deleteAnnouncementHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id, announcementId } = announcementIdParamSchema.parse(req.params);
  await deleteAnnouncement(id, announcementId, user.id, user.role);
  sendSuccess(res, null, "Announcement deleted");
});

export const addAnnouncementFilesHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id, announcementId } = announcementIdParamSchema.parse(req.params);
  const files = await addAnnouncementFiles(id, announcementId, user.id, user.role, filesOf(req));
  sendSuccess(res, files, "Files attached", 201);
});

export const deleteAnnouncementFileHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id, announcementId, attachmentId } = announcementAttachmentParamSchema.parse(req.params);
  await deleteAnnouncementFile(id, announcementId, attachmentId, user.id, user.role);
  sendSuccess(res, null, "File removed");
});

export const downloadAnnouncementFileHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id, announcementId, attachmentId } = announcementAttachmentParamSchema.parse(req.params);
  const link = await getAnnouncementFileDownload(id, announcementId, attachmentId, user.id, user.role);
  sendSuccess(res, link, "Download link created");
});

export const listAnnouncementCommentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id, announcementId } = announcementIdParamSchema.parse(req.params);
  const query = listAnnouncementCommentsQuerySchema.parse(req.query);
  const { comments, total } = await listAnnouncementComments(id, announcementId, user.id, user.role, query.page, query.limit);
  sendSuccess(res, comments, "Comments retrieved", 200, paginationMeta(total, query.page, query.limit));
});

export const createAnnouncementCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id, announcementId } = announcementIdParamSchema.parse(req.params);
  const { content } = announcementCommentSchema.parse(req.body ?? {});
  const comment = await createAnnouncementComment(id, announcementId, user.id, user.role, content);
  sendSuccess(res, comment, "Comment posted", 201);
});

export const updateAnnouncementCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id, announcementId, commentId } = announcementCommentParamSchema.parse(req.params);
  const { content } = announcementCommentSchema.parse(req.body ?? {});
  const comment = await updateAnnouncementComment(id, announcementId, commentId, user.id, user.role, content);
  sendSuccess(res, comment, "Comment updated");
});

export const deleteAnnouncementCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id, announcementId, commentId } = announcementCommentParamSchema.parse(req.params);
  await deleteAnnouncementComment(id, announcementId, commentId, user.id, user.role);
  sendSuccess(res, null, "Comment deleted");
});
