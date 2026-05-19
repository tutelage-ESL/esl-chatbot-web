import { z } from "zod";

export const announcementParamSchema = z.object({
  id: z.string().uuid("Invalid class ID"),
});

export const createAnnouncementSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(2000),
});

export const listAnnouncementsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
});

export type CreateAnnouncementBody = z.infer<typeof createAnnouncementSchema>;
