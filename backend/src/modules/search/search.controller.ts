import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { searchQuerySchema } from "./search.schema.ts";
import { globalSearch } from "./search.service.ts";

export const globalSearchHandler = asyncHandler(async (req: Request, res: Response) => {
  const { q } = searchQuerySchema.parse(req.query);
  const results = await globalSearch(q, req.user!.id, req.user!.role);
  sendSuccess(res, results, "Search results retrieved");
});
