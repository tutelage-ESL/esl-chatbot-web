import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { getUsersQuerySchema, getUserParamSchema } from "./users.schema.ts";
import { getUsers, getUserById } from "./users.service.ts";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = getUsersQuerySchema.parse(req.query);
  const { users, total } = await getUsers(
    query.page,
    query.limit,
    query.role,
    query.search,
    query.subscriptionStatus,
  );
  const meta = paginationMeta(total, query.page, query.limit);

  sendSuccess(res, users, "Users retrieved successfully", 200, meta);
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = getUserParamSchema.parse(req.params);
  const user = await getUserById(id);

  sendSuccess(res, user, "User retrieved successfully");
});
