import { z } from "zod/v4";

export const createSessionSchema = z.object({
  mode: z.enum(["TEXT", "VOICE"]).default("TEXT"),
  topic: z.string().trim().max(200).optional().nullable(),
});

export const updateSessionSchema = z
  .object({
    title: z.string().trim().min(1, "Give it a name").max(60, "At most 60 characters").optional(),
    isPinned: z.boolean().optional(),
  })
  .refine((body) => body.title !== undefined || body.isPinned !== undefined, "Send a title or isPinned.");

export const getSessionParamSchema = z.object({
  id: z.string().uuid("Invalid session ID"),
});

export const listSessionsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  mode: z.enum(["TEXT", "VOICE"]).optional(),
  active: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
});

export const sessionStatsQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 30))
    .pipe(z.number().int().min(1).max(90)),
  userId: z.string().uuid("Invalid user ID").optional(),
});

export type CreateSessionBody = z.infer<typeof createSessionSchema>;
export type UpdateSessionBody = z.infer<typeof updateSessionSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type SessionStatsQuery = z.infer<typeof sessionStatsQuerySchema>;
