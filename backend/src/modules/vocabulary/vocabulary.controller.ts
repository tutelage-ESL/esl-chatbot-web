import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { sendSuccess } from "../../utils/apiResponse.ts";
import { paginationMeta } from "../../utils/pagination.ts";
import {
  addVocabularySchema,
  updateVocabularySchema,
  reviewSchema,
  listVocabularyQuerySchema,
  vocabIdParamSchema,
} from "./vocabulary.schema.ts";
import {
  listVocabulary,
  getDueCards,
  addVocabulary,
  getVocabularyById,
  updateVocabulary,
  deleteVocabulary,
  reviewVocabulary,
} from "./vocabulary.service.ts";

export const listVocabularyHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = listVocabularyQuerySchema.parse(req.query);
  const { items, total } = await listVocabulary(req.user!.id, query);
  const meta = paginationMeta(total, query.page, query.limit);
  sendSuccess(res, items, "Vocabulary retrieved successfully", 200, meta);
});

export const getDueCardsHandler = asyncHandler(async (req: Request, res: Response) => {
  const items = await getDueCards(req.user!.id);
  sendSuccess(res, items, "Due cards retrieved successfully");
});

export const addVocabularyHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = addVocabularySchema.parse(req.body);
  const item = await addVocabulary(req.user!.id, input);
  sendSuccess(res, item, "Word added to vocabulary", 201);
});

export const getVocabularyByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = vocabIdParamSchema.parse(req.params);
  const item = await getVocabularyById(id, req.user!.id);
  sendSuccess(res, item, "Vocabulary item retrieved successfully");
});

export const updateVocabularyHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = vocabIdParamSchema.parse(req.params);
  const input = updateVocabularySchema.parse(req.body);
  const item = await updateVocabulary(id, req.user!.id, input);
  sendSuccess(res, item, "Vocabulary item updated successfully");
});

export const deleteVocabularyHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = vocabIdParamSchema.parse(req.params);
  await deleteVocabulary(id, req.user!.id);
  sendSuccess(res, null, "Vocabulary item deleted successfully");
});

export const reviewVocabularyHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = vocabIdParamSchema.parse(req.params);
  const { quality } = reviewSchema.parse(req.body);
  const result = await reviewVocabulary(id, req.user!.id, quality);
  sendSuccess(res, result, "Review submitted successfully");
});
