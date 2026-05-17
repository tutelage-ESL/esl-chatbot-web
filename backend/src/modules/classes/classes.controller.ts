import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { AppError } from "../../utils/AppError.ts";
import {
  getClassesQuerySchema,
  getClassParamSchema,
  createClassSchema,
  updateCodeSettingsSchema,
  setBlockedSchema,
  joinByCodeSchema,
  classMemberParamSchema,
} from "./classes.schema.ts";
import {
  getClasses,
  getClassById,
  createClass,
  refreshClassCode,
  updateClassCodeSettings,
  setClassCodeBlocked,
  joinClassByCode,
  listMyClasses,
  getClassStudents,
  getClassStudentDetail,
  removeMember,
} from "./classes.service.ts";

// ── Read (admin) ───────────────────────────────────────────

export const listClasses = asyncHandler(async (req: Request, res: Response) => {
  const query = getClassesQuerySchema.parse(req.query);
  const { classes, total } = await getClasses(query.page, query.limit, query.status);
  const meta = paginationMeta(total, query.page, query.limit);
  sendSuccess(res, classes, "Classes retrieved successfully", 200, meta);
});

export const getClass = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = getClassParamSchema.parse(req.params);
  const cls = await getClassById(id, req.user.id, req.user.role);
  sendSuccess(res, cls, "Class retrieved successfully");
});

// ── Create (tutor / admin) ────────────────────────────────

export const createClassHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const body = createClassSchema.parse(req.body);
  const cls = await createClass(req.user.id, body);
  sendSuccess(res, cls, "Class created successfully", 201);
});

// ── Code management (tutor in class / admin) ─────────────

export const refreshCodeHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = getClassParamSchema.parse(req.params);
  const result = await refreshClassCode(id, req.user.id, req.user.role);
  sendSuccess(res, result, "Class code refreshed");
});

export const updateCodeSettingsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = getClassParamSchema.parse(req.params);
  const body = updateCodeSettingsSchema.parse(req.body);
  const result = await updateClassCodeSettings(
    id,
    req.user.id,
    req.user.role,
    body.classCodeRefreshIntervalSeconds,
  );
  sendSuccess(res, result, "Class code settings updated");
});

export const setBlockedHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = getClassParamSchema.parse(req.params);
  const body = setBlockedSchema.parse(req.body);
  const result = await setClassCodeBlocked(id, req.user.id, req.user.role, body.blocked);
  sendSuccess(res, result, body.blocked ? "Class code blocked" : "Class code unblocked");
});

// ── Join by code (any authenticated user) ─────────────────

export const joinByCodeHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const body = joinByCodeSchema.parse(req.body);
  const result = await joinClassByCode(req.user.id, body.classCode);
  sendSuccess(res, result, "Joined class successfully", 201);
});

// ── My classes (any authenticated user) ───────────────────

export const listMyClassesHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const classes = await listMyClasses(req.user.id);
  sendSuccess(res, classes, "Your classes retrieved");
});

// ── Student monitoring (tutor / admin) ────────────────────

export const listClassStudentsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = getClassParamSchema.parse(req.params);
  const students = await getClassStudents(id, req.user.id, req.user.role);
  sendSuccess(res, students, "Students retrieved successfully");
});

export const getClassStudentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id, userId } = classMemberParamSchema.parse(req.params);
  const student = await getClassStudentDetail(id, userId, req.user.id, req.user.role);
  sendSuccess(res, student, "Student detail retrieved successfully");
});

// ── Remove member (self-leave / tutor / admin) ────────────

export const removeMemberHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id, userId } = classMemberParamSchema.parse(req.params);
  await removeMember(id, userId, req.user.id, req.user.role);
  sendSuccess(res, null, userId === req.user.id ? "Left class successfully" : "Member removed successfully");
});
