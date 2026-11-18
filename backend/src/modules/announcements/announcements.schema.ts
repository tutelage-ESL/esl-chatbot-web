import { z } from "zod";

export const announcementParamSchema = z.object({
  id: z.string().uuid("Invalid class ID"),
});

export const announcementIdParamSchema = z.object({
  id: z.string().uuid("Invalid class ID"),
  announcementId: z.string().uuid("Invalid announcement ID"),
});

export const announcementCommentParamSchema = announcementIdParamSchema.extend({
  commentId: z.string().uuid("Invalid comment ID"),
});

export const announcementAttachmentParamSchema = announcementIdParamSchema.extend({
  attachmentId: z.string().uuid("Invalid file ID"),
});

const announcementContent = z.string().trim().min(1, "Content is required").max(2000);

export const createAnnouncementSchema = z.object({
  content: announcementContent,
});

export const updateAnnouncementSchema = z
  .object({
    content: announcementContent.optional(),
    // Multipart and query-style clients send booleans as strings
    commentsEnabled: z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean()).optional(),
  })
  .refine((b) => b.content !== undefined || b.commentsEnabled !== undefined, "Nothing to update");

export const announcementCommentSchema = z.object({
  content: z.string().trim().min(1, "Write a comment").max(2000),
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

export const listAnnouncementCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export type CreateAnnouncementBody = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementBody = z.infer<typeof updateAnnouncementSchema>;
