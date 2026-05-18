import { z } from "zod";

export const addVocabularySchema = z.object({
  word: z.string().min(1).max(100).trim(),
  definition: z.string().min(1).max(500).trim(),
  pronunciation: z.string().max(200).trim().optional(),
  example: z.string().max(500).trim().optional(),
  partOfSpeech: z.string().max(50).trim().optional(),
  difficulty: z.number().int().min(1).max(5).default(1),
  category: z.string().max(100).trim().optional(),
});

export const updateVocabularySchema = z.object({
  definition: z.string().min(1).max(500).trim().optional(),
  pronunciation: z.string().max(200).trim().nullable().optional(),
  example: z.string().max(500).trim().nullable().optional(),
  partOfSpeech: z.string().max(50).trim().nullable().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  category: z.string().max(100).trim().nullable().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const reviewSchema = z.object({
  quality: z.number().int().min(0).max(5),
});

export const listVocabularyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  due: z.enum(["true", "false"]).optional(),
  source: z.enum(["MANUAL", "SESSION"]).optional(),
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export const vocabIdParamSchema = z.object({
  id: z.string().uuid("Invalid vocabulary ID"),
});
