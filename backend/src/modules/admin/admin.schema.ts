import { z } from "zod";

export const updateUserBodySchema = z
  .object({
    role: z.enum(["STUDENT", "TUTOR", "ADMIN"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.isActive !== undefined, {
    message: "At least one of 'role' or 'isActive' must be provided",
  });

export const assignSubscriptionBodySchema = z
  .object({
    plan: z.enum(["FREE", "GOLD", "PREMIUM"]),
    durationMonths: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).optional(),
    endDate: z
      .string()
      .datetime({ message: "endDate must be a valid ISO datetime string" })
      .optional(),
    // Who processed this payment — defaults to CASH (admin manual assignment)
    paymentProvider: z.enum(["STRIPE", "FIB", "CASH"]).optional(),
  })
  .refine(
    (data) => data.plan === "FREE" || data.durationMonths !== undefined || data.endDate !== undefined,
    { message: "Either 'durationMonths' or 'endDate' must be provided for GOLD or PREMIUM plans" },
  )
  .refine(
    (data) => {
      if (data.endDate) return new Date(data.endDate) > new Date();
      return true;
    },
    { message: "endDate must be in the future" },
  );

export const adminUserParamSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
});

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const AI_PERSONALITIES = ["FRIENDLY", "FORMAL", "CASUAL", "ENCOURAGING", "STRICT", "PATIENT"] as const;

export const adminUpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).nullable().optional(),
});

export const adminUpdateLearnerProfileSchema = z.object({
  currentLevel: z.enum(CEFR_LEVELS).nullable().optional(),
  targetLevel: z.enum(CEFR_LEVELS).nullable().optional(),
  learningPurpose: z.string().max(500).nullable().optional(),
  topicsOfInterest: z.array(z.string().max(50)).max(20).nullable().optional(),
  aiPersonality: z.enum(AI_PERSONALITIES).nullable().optional(),
  voiceSpeed: z.number().min(0.5).max(2.0).optional(),
  autoSpeak: z.boolean().optional(),
  weeklyGoalMinutes: z.number().int().min(5).max(840).optional(),
  timezone: z.string().max(60).optional(),
});

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type AssignSubscriptionBody = z.infer<typeof assignSubscriptionBodySchema>;
export type AdminUpdateProfileInput = z.infer<typeof adminUpdateProfileSchema>;
export type AdminUpdateLearnerProfileInput = z.infer<typeof adminUpdateLearnerProfileSchema>;
