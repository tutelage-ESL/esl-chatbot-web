import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { AppError } from "../../utils/AppError.ts";
import {
  idParamSchema,
  createTaskSchema,
  updateTaskSchema,
  createSubmissionSchema,
  feedbackSchema,
  paginationSchema,
} from "./tasks.schema.ts";
import {
  createTask,
  listClassTasks,
  getTask,
  updateTask,
  deleteTask,
  createSubmission,
  listSubmissions,
  updateFeedback,
} from "./tasks.service.ts";

// ── Class-scoped handlers ─────────────────────────────────

export const createTaskHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id: classId } = idParamSchema.parse(req.params);
  const { body } = createTaskSchema.parse({ body: req.body });
  const task = await createTask(classId, req.user.id, req.user.role, body);
  sendSuccess(res, task, "Task created", 201);
});

export const listClassTasksHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id: classId } = idParamSchema.parse(req.params);
  const { query } = paginationSchema.parse({ query: req.query });
  const { tasks, total } = await listClassTasks(classId, req.user.id, req.user.role, query.page, query.limit);
  const meta = paginationMeta(total, query.page, query.limit);
  sendSuccess(res, tasks, "Tasks retrieved", 200, meta);
});

// ── Task-scoped handlers ──────────────────────────────────

export const getTaskHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = idParamSchema.parse(req.params);
  const task = await getTask(id, req.user.id, req.user.role);
  sendSuccess(res, task, "Task retrieved");
});

export const updateTaskHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { params, body } = updateTaskSchema.parse({ params: req.params, body: req.body });
  const task = await updateTask(params.id, req.user.id, req.user.role, body);
  sendSuccess(res, task, "Task updated");
});

export const deleteTaskHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = idParamSchema.parse(req.params);
  await deleteTask(id, req.user.id, req.user.role);
  sendSuccess(res, null, "Task deleted");
});

export const createSubmissionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { params, body } = createSubmissionSchema.parse({ params: req.params, body: req.body });
  const submission = await createSubmission(params.id, req.user.id, req.user.role, body);
  sendSuccess(res, submission, "Submission created", 201);
});

export const listSubmissionsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { id } = idParamSchema.parse(req.params);
  const { query } = paginationSchema.parse({ query: req.query });
  const { submissions, total } = await listSubmissions(id, req.user.id, req.user.role, query.page, query.limit);
  const meta = paginationMeta(total, query.page, query.limit);
  sendSuccess(res, submissions, "Submissions retrieved", 200, meta);
});

export const updateFeedbackHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const { params, body } = feedbackSchema.parse({ params: req.params, body: req.body });
  const submission = await updateFeedback(params.id, params.submissionId, req.user.id, req.user.role, body.feedback);
  sendSuccess(res, submission, "Feedback saved");
});
