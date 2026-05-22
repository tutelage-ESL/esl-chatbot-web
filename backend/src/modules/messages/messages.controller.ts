import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { AppError } from "../../utils/AppError.ts";
import {
  sendMessageSchema,
  messageParamsSchema,
  listMessagesQuerySchema,
  voiceMessageSchema,
} from "./messages.schema.ts";
import { sendMessage, listMessages } from "./messages.service.ts";
import { sendVoiceMessage } from "./voice-messages.service.ts";

export const sendMessageHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { sessionId } = messageParamsSchema.parse(req.params);
  const body = sendMessageSchema.parse(req.body);
  const result = await sendMessage(req.user.id, sessionId, body.content, body.type);
  sendSuccess(res, result, "Message sent", 201);
});

export const listMessagesHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { sessionId } = messageParamsSchema.parse(req.params);
  const query = listMessagesQuerySchema.parse(req.query);
  const { messages, total } = await listMessages(
    req.user.id,
    sessionId,
    query.page,
    query.limit,
  );
  const meta = paginationMeta(total, query.page, query.limit);
  sendSuccess(res, messages, "Messages retrieved", 200, meta);
});

export const sendVoiceMessageHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { sessionId } = messageParamsSchema.parse(req.params);

  if (!req.file?.buffer) {
    throw new AppError("Audio file required. Send multipart/form-data with field 'audio'.", 400);
  }

  const body = voiceMessageSchema.parse(req.body);
  const result = await sendVoiceMessage(
    req.user.id,
    sessionId,
    req.file.buffer,
    req.file.mimetype,
    body.audioDurationSec,
  );

  sendSuccess(res, result, "Voice message sent", 201);
});
