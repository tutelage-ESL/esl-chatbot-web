import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { AppError } from "../../utils/AppError.ts";
import {
  idParamSchema,
  createCommentSchema,
  updateCommentSchema,
  commentParamSchema,
  attachmentParamSchema,
  commentListSchema,
} from "./tasks.schema.ts";
import { listComments, createComment, updateComment, deleteComment } from "./tasks.comments.service.ts";
import { addTaskAttachments, deleteTaskAttachment, getTaskFileDownload } from "./tasks.attachments.service.ts";
import type { UploadedFile } from "./tasks.files.ts";

const filesOf = (req: Request): UploadedFile[] => (Array.isArray(req.files) ? req.files : []);

function actor(req: Request) {
  if (!req.user) throw new AppError("Authentication required", 401);
  return req.user;
}

export const listCommentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id } = idParamSchema.parse(req.params);
  const { query } = commentListSchema.parse({ query: req.query });
  const { comments, total } = await listComments(id, user.id, user.role, query.page, query.limit);
  sendSuccess(res, comments, "Comments retrieved", 200, paginationMeta(total, query.page, query.limit));
});

export const createCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { params, body } = createCommentSchema.parse({ params: req.params, body: req.body ?? {} });
  const comment = await createComment(params.id, user.id, user.role, body.content, filesOf(req));
  sendSuccess(res, comment, "Comment posted", 201);
});

export const updateCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { params, body } = updateCommentSchema.parse({ params: req.params, body: req.body ?? {} });
  const comment = await updateComment(params.id, params.commentId, user.id, user.role, body, filesOf(req));
  sendSuccess(res, comment, "Comment updated");
});

export const deleteCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { params } = commentParamSchema.parse({ params: req.params });
  await deleteComment(params.id, params.commentId, user.id, user.role);
  sendSuccess(res, null, "Comment deleted");
});

export const addTaskAttachmentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { id } = idParamSchema.parse(req.params);
  const attachments = await addTaskAttachments(id, user.id, user.role, filesOf(req));
  sendSuccess(res, attachments, "Files attached", 201);
});

export const deleteTaskAttachmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { params } = attachmentParamSchema.parse({ params: req.params });
  await deleteTaskAttachment(params.id, params.attachmentId, user.id, user.role);
  sendSuccess(res, null, "File removed");
});

export const downloadTaskFileHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const { params } = attachmentParamSchema.parse({ params: req.params });
  const link = await getTaskFileDownload(params.id, params.attachmentId, user.id, user.role);
  sendSuccess(res, link, "Download link created");
});
