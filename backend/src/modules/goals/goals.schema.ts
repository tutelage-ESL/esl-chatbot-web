import { z } from "zod";

export const GOAL_TYPES = ["VOCABULARY", "SPEAKING", "GRAMMAR", "CONVERSATION", "STUDY_TIME"] as const;
export const GOAL_STATUSES = ["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const createGoalSchema = z
  .object({
    // Tutors/admins assign to a student; students omit this (defaults to self)
    assignedToUserId: z.string().uuid("Invalid user ID").optional(),
    type: z.enum(GOAL_TYPES),
    description: z.string().min(1).max(500),
    target: z.number().int().min(1),
    difficulty: z.enum(DIFFICULTIES).optional(),
    targetDate: z.string().datetime({ offset: true }).optional(),
    actionPlan: z.string().max(1000).optional(),
  });

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z
  .object({
    description: z.string().min(1).max(500).optional(),
    target: z.number().int().min(1).optional(),
    difficulty: z.enum(DIFFICULTIES).nullable().optional(),
    status: z.enum(GOAL_STATUSES).optional(),
    progress: z.number().min(0).max(100).optional(),
    targetDate: z.string().datetime({ offset: true }).nullable().optional(),
    actionPlan: z.string().max(1000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const listGoalsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  status: z.enum(GOAL_STATUSES).optional(),
  type: z.enum(GOAL_TYPES).optional(),
  studentId: z.string().uuid().optional(),
});

export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>;

export const goalParamSchema = z.object({
  id: z.string().uuid("Invalid goal ID"),
});
