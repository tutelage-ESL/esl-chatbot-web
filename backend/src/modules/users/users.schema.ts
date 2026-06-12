import { z } from "zod";

export const getUsersQuerySchema = z.object({
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
  role: z.enum(["STUDENT", "TUTOR", "ADMIN"]).optional(),
  search: z.string().optional(),
  subscriptionStatus: z.enum(["ACTIVE", "INACTIVE", "CANCELLED", "PAST_DUE"]).optional(),
});

export const getUserParamSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;

// ─── Self-profile update ───────────────────────────────────────────────────────

export const updateMyProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).nullable().optional(),
});

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;

// ─── Learner profile update ───────────────────────────────────────────────────

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const AI_PERSONALITIES = ["FRIENDLY", "FORMAL", "CASUAL", "ENCOURAGING", "STRICT", "PATIENT"] as const;

export const updateLearnerProfileSchema = z.object({
  currentLevel: z.enum(CEFR_LEVELS).nullable().optional(),
  targetLevel: z.enum(CEFR_LEVELS).nullable().optional(),
  learningPurpose: z.string().max(500).nullable().optional(),
  topicsOfInterest: z.array(z.string().max(50)).max(20).nullable().optional(),
  aiPersonality: z.enum(AI_PERSONALITIES).nullable().optional(),
  voiceSpeed: z.number().min(0.5).max(2.0).optional(),
  autoSpeak: z.boolean().optional(),
  uiLanguage: z.string().min(2).max(10).optional(),
  theme: z.enum(["light", "dark"]).optional(),
  weeklyGoalMinutes: z.number().int().min(5).max(840).optional(),
  timezone: z.string().max(60).optional(),
  emailDigestEnabled: z.boolean().optional(),
});

export type UpdateLearnerProfileInput = z.infer<typeof updateLearnerProfileSchema>;
