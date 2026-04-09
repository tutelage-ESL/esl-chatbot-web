import { z } from "zod";
import {
  MIN_REFRESH_INTERVAL_SECONDS,
  MAX_REFRESH_INTERVAL_SECONDS,
} from "./classCode.util.ts";

// ── Query / param schemas ─────────────────────────────────

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

// ── Body schemas ─────────────────────────────────────────

const refreshIntervalField = z
  .number()
  .int("Refresh interval must be an integer number of seconds")
  .min(
    MIN_REFRESH_INTERVAL_SECONDS,
    `Refresh interval must be at least ${MIN_REFRESH_INTERVAL_SECONDS} seconds`,
  )
  .max(
    MAX_REFRESH_INTERVAL_SECONDS,
    `Refresh interval cannot exceed ${MAX_REFRESH_INTERVAL_SECONDS} seconds (~100 years)`,
  )
  .nullable();

export const createClassSchema = z.object({
  className: z.string().trim().min(1, "Class name is required").max(100),
  classCategory: z.string().trim().max(100).optional().nullable(),
  // Optional on create — null/omitted means "permanent code (no auto refresh)".
  classCodeRefreshIntervalSeconds: refreshIntervalField.optional(),
});

export const updateCodeSettingsSchema = z.object({
  classCodeRefreshIntervalSeconds: refreshIntervalField,
});

export const setBlockedSchema = z.object({
  blocked: z.boolean(),
});

export const joinByCodeSchema = z.object({
  classCode: z.string().trim().min(1, "Class code is required").max(32),
});

// ── Inferred types ───────────────────────────────────────

export type GetClassesQuery = z.infer<typeof getClassesQuerySchema>;
export type CreateClassBody = z.infer<typeof createClassSchema>;
export type UpdateCodeSettingsBody = z.infer<typeof updateCodeSettingsSchema>;
export type SetBlockedBody = z.infer<typeof setBlockedSchema>;
export type JoinByCodeBody = z.infer<typeof joinByCodeSchema>;
