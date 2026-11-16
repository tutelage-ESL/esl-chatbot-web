import { z } from "zod/v4";

export const initiateFibSchema = z.object({
  plan: z.enum(["GOLD", "PREMIUM"]),
  intervalMonths: z.union([
    z.literal(1),
    z.literal(3),
    z.literal(6),
    z.literal(12),
  ]),
});

export const fibSubscriptionIdParamSchema = z.object({
  subscriptionId: z.string().min(1),
});

export const fibWebhookSchema = z.object({
  subscriptionId: z.string().min(1),
  status: z.enum(["DRAFT", "TRIAL", "ACTIVE", "REJECTED", "CANCELLED"]),
});
