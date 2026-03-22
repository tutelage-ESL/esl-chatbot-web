import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import { getClassesQuerySchema, getClassParamSchema } from "./classes.schema.ts";
import { getClasses, getClassById } from "./classes.service.ts";

export const listClasses = asyncHandler(async (req: Request, res: Response) => {
  const query = getClassesQuerySchema.parse(req.query);
  const { classes, total } = await getClasses(query.page, query.limit, query.status);
  const meta = paginationMeta(total, query.page, query.limit);

  sendSuccess(res, classes, "Classes retrieved successfully", 200, meta);
});

export const getClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = getClassParamSchema.parse(req.params);
  const cls = await getClassById(id);

  sendSuccess(res, cls, "Class retrieved successfully");
});
