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
