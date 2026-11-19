import { z } from "zod";

export const addVocabularySchema = z.object({
  word: z.string().min(1).max(100).trim(),
  definition: z.string().min(1).max(500).trim(),
  pronunciation: z.string().max(200).trim().optional(),
  example: z.string().max(500).trim().optional(),
  partOfSpeech: z.string().max(50).trim().optional(),
  difficulty: z.number().int().min(1).max(5).default(1),
  category: z.string().max(100).trim().optional(),
  // Tutor/admin only: assign this word to a student instead of adding it to your own list.
  assignedToUserId: z.string().uuid("Invalid user ID").optional(),
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
  source: z.enum(["MANUAL", "SESSION", "ASSIGNED"]).optional(),
  listId: z.string().uuid().optional(),
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export const vocabIdParamSchema = z.object({
  id: z.string().uuid("Invalid vocabulary ID"),
});

// Tutor/admin: the AI writes meaning, example and part of speech for these words.
export const enrichWordsSchema = z.object({
  words: z.array(z.string().trim().min(1).max(100)).min(1).max(30),
});

const listWordSchema = z.object({
  word: z.string().trim().min(1).max(100),
  definition: z.string().trim().min(1, "Every word needs a meaning").max(500),
  example: z.string().trim().max(500).optional(),
  partOfSpeech: z.string().trim().max(50).optional(),
});

// Class word list: ALL students, ONLY the chosen ones, or everyone EXCEPT the chosen ones.
// An empty title gives the words on their own (no list name for students).
export const createClassListSchema = z.object({
  title: z.string().trim().max(80).default(""),
  words: z.array(listWordSchema).min(1).max(30),
  target: z.object({
    mode: z.enum(["ALL", "ONLY", "EXCEPT"]),
    studentIds: z.array(z.string().uuid()).max(500).default([]),
  }),
});

export const classIdParamSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
});

// Edit a class word list: rename it, fix cards, add words. Words left out stay as they are
// (lists are never shrunk: students keep every word they were given).
export const updateClassListSchema = z.object({
  title: z.string().trim().max(80).optional(),
  words: z.array(listWordSchema).max(30).optional(),
}).refine((v) => v.title !== undefined || v.words !== undefined, { message: "Nothing to change" });

export const classListParamSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
  listId: z.string().uuid("Invalid list ID"),
});
