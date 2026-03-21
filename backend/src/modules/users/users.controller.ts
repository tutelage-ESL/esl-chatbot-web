import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { getUsersQuerySchema } from "./users.schema.ts";
import { getUsers } from "./users.service.ts";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = getUsersQuerySchema.parse(req.query);
  const { users, total } = await getUsers(query.page, query.limit);
  const meta = paginationMeta(total, query.page, query.limit);

  sendSuccess(res, users, "Users retrieved successfully", 200, meta);
});
