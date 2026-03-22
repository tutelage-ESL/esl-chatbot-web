import { z } from "zod";

export const getClassesQuerySchema = z.object({
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
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const getClassParamSchema = z.object({
  id: z.string().uuid("Invalid class ID"),
});

export type GetClassesQuery = z.infer<typeof getClassesQuerySchema>;
