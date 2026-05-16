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

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type AssignSubscriptionBody = z.infer<typeof assignSubscriptionBodySchema>;
