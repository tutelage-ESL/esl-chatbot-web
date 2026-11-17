import { z } from "zod";

export const idParamSchema = z.object({ id: z.string().uuid() });

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    deadline: z.string().datetime({ offset: true }).optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().min(1).max(5000).optional(),
      deadline: z.string().datetime({ offset: true }).nullable().optional(),
      closed: z.boolean().optional(),
      commentsEnabled: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" }),
});

export const createSubmissionSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  // Files arrive as multipart, so "something to hand in" is checked in createSubmission.
  body: z.object({
    content: z.string().max(10000).optional(),
    fileUrl: z.string().url().optional(),
  }),
});

export const feedbackSchema = z.object({
  params: z.object({ id: z.string().uuid(), submissionId: z.string().uuid() }),
  body: z.object({
    feedback: z.string().min(1).max(5000),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

// ── Comments + attachments (multipart: text fields arrive as strings) ─────

const commentParams = z.object({ id: z.string().uuid(), commentId: z.string().uuid() });
const commentContent = z.string().trim().max(2000, "Comments can be up to 2000 characters");

export const createCommentSchema = z.object({
  params: idParamSchema,
  body: z.object({ content: commentContent.optional() }),
});

export const updateCommentSchema = z.object({
  params: commentParams,
  body: z.object({
    content: commentContent.optional(),
    // Comma-separated attachment ids to remove from the comment
    removeAttachmentIds: z
      .preprocess(
        (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v),
        z.array(z.string().uuid()).max(10),
      )
      .optional(),
  }),
});

export const commentParamSchema = z.object({ params: commentParams });

export const attachmentParamSchema = z.object({
  params: z.object({ id: z.string().uuid(), attachmentId: z.string().uuid() }),
});

export const commentListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(100),
  }),
});
