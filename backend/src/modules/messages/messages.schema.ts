import { z } from "zod/v4";

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Message content is required").max(5000),
  type: z.enum(["TEXT", "VOICE"]).default("TEXT"),
});

export const messageParamsSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
});

export const listMessagesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().int().min(1).max(100)),
});

export type SendMessageBody = z.infer<typeof sendMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
