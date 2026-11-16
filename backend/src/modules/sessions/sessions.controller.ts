import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { AppError } from "../../utils/AppError.ts";
import {
  createSessionSchema,
  getSessionParamSchema,
  listSessionsQuerySchema,
  sessionStatsQuerySchema,
} from "./sessions.schema.ts";
import {
  createSession,
  listSessions,
  getSessionById,
  endSession,
  getSessionStats,
} from "./sessions.service.ts";

export const createSessionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const body = createSessionSchema.parse(req.body);
  const session = await createSession(req.user.id, body.mode, body.topic);
  sendSuccess(res, session, "Session created", 201);
});

export const listSessionsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const query = listSessionsQuerySchema.parse(req.query);
  const { sessions, total } = await listSessions(
    req.user.id,
    query.page,
    query.limit,
    query.mode,
    query.active,
  );
  const meta = paginationMeta(total, query.page, query.limit);
  sendSuccess(res, sessions, "Sessions retrieved", 200, meta);
});

export const getSessionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = getSessionParamSchema.parse(req.params);
  const session = await getSessionById(id, req.user.id);
  sendSuccess(res, session, "Session retrieved");
});

export const endSessionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = getSessionParamSchema.parse(req.params);
  const session = await endSession(id, req.user.id);
  sendSuccess(res, session, "Session ended");
});

export const getSessionStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const query = sessionStatsQuerySchema.parse(req.query);
  const targetUserId = query.userId ?? req.user.id;
  const stats = await getSessionStats(targetUserId, query.days, req.user.id, req.user.role);
  sendSuccess(res, stats, "Session stats retrieved");
});
