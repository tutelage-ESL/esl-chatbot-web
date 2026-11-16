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
    })
    .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" }),
});

export const createSubmissionSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      content: z.string().min(1).max(10000).optional(),
      fileUrl: z.string().url().optional(),
    })
    .refine((d) => d.content || d.fileUrl, {
      message: "content or fileUrl is required",
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
