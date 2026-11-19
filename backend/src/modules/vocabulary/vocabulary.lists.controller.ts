import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { classIdParamSchema, classListParamSchema, createClassListSchema, enrichWordsSchema, updateClassListSchema } from "./vocabulary.schema.ts";
import { enrichWords } from "./vocabulary.enrich.ts";
import { createClassList, listClassLists, updateClassList } from "./vocabulary.lists.service.ts";

export const enrichWordsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { words } = enrichWordsSchema.parse(req.body);
  sendSuccess(res, await enrichWords(words), "Words filled in");
});

export const listClassListsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = classIdParamSchema.parse(req.params);
  sendSuccess(res, await listClassLists(req.user!.id, req.user!.role, classId), "Word lists retrieved");
});

export const createClassListHandler = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = classIdParamSchema.parse(req.params);
  const input = createClassListSchema.parse(req.body);
  sendSuccess(res, await createClassList(req.user!.id, req.user!.role, classId, input), "Words assigned", 201);
});

export const updateClassListHandler = asyncHandler(async (req: Request, res: Response) => {
  const { classId, listId } = classListParamSchema.parse(req.params);
  const input = updateClassListSchema.parse(req.body);
  sendSuccess(res, await updateClassList(req.user!.id, req.user!.role, classId, listId, input), "Word list updated");
});
