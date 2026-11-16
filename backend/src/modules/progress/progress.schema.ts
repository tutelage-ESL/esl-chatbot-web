import { z } from "zod";

export const listProgressQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export const summaryQuerySchema = z.object({
  days: z.coerce.number().int().refine((v) => [7, 14, 30].includes(v), {
    message: "days must be 7, 14, or 30",
  }).default(7),
});
