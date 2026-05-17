import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import {
  createGoalSchema,
  updateGoalSchema,
  listGoalsQuerySchema,
  goalParamSchema,
} from "./goals.schema.ts";
import { listGoals, createGoal, getGoalById, updateGoal, deleteGoal } from "./goals.service.ts";

export const listGoalsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = listGoalsQuerySchema.parse(req.query);
  const { goals, total } = await listGoals(req.user!.id, req.user!.role, query);
  const meta = paginationMeta(total, query.page, query.limit);
  sendSuccess(res, goals, "Goals retrieved successfully", 200, meta);
});

export const createGoalHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = createGoalSchema.parse(req.body);
  const goal = await createGoal(req.user!.id, req.user!.role, input);
  sendSuccess(res, goal, "Goal created successfully", 201);
});

export const getGoalHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = goalParamSchema.parse(req.params);
  const goal = await getGoalById(id, req.user!.id, req.user!.role);
  sendSuccess(res, goal, "Goal retrieved successfully");
});

export const updateGoalHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = goalParamSchema.parse(req.params);
  const input = updateGoalSchema.parse(req.body);
  const goal = await updateGoal(id, req.user!.id, req.user!.role, input);
  sendSuccess(res, goal, "Goal updated successfully");
});

export const deleteGoalHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = goalParamSchema.parse(req.params);
  await deleteGoal(id, req.user!.id, req.user!.role);
  sendSuccess(res, null, "Goal deleted successfully");
});
