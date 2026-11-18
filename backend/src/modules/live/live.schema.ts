import { z } from "zod/v4";

export const liveSessionParamSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
});

// One exchange of a live call, as heard by the live model's own transcription.
export const liveTurnSchema = z.object({
  user: z.string().trim().min(1, "Nothing was said").max(2000),
  tutor: z.string().trim().max(4000).default(""),
  // The learner's own audio for this answer: base64 raw PCM, 16 kHz 16-bit mono, ≤ 30 s.
  audio: z.string().max(1_400_000).optional(),
});
