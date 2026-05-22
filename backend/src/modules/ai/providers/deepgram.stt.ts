import { DeepgramClient } from "@deepgram/sdk";
import { env } from "../../../config/env.ts";
import type { STTResult } from "../ai.types.ts";
import type { ListenV1Response } from "@deepgram/sdk";

// Dev + FREE production STT — Deepgram Nova-3
// $200 free credit on signup (~46,500 batch-minutes — roughly 9 years at 100 FREE users × 50 min/month)
// After credit: switch to Groq Whisper Turbo ($0.00067/min) — one-line change here
const MODEL = "nova-3";

export async function deepgramSTT(audioBuffer: Buffer, mimeType: string): Promise<STTResult> {
  if (!env.DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY not configured");
  }

  const client = new DeepgramClient({ apiKey: env.DEEPGRAM_API_KEY });

  const response = await client.listen.v1.media.transcribeFile(
    {
      data: audioBuffer,
      contentType: mimeType,
      contentLength: audioBuffer.length,
    },
    {
      model: MODEL,
      smart_format: true,
      language: "en",
    },
  );

  const typed = response as ListenV1Response;
  const alternative = typed.results?.channels?.[0]?.alternatives?.[0];

  if (!alternative?.transcript) {
    throw new Error("Deepgram returned empty transcript");
  }

  return {
    transcript: alternative.transcript,
    confidence: alternative.confidence ?? 0,
    words: (alternative.words ?? []).map((w) => ({
      word: w.word ?? "",
      start: w.start ?? 0,
      end: w.end ?? 0,
      confidence: w.confidence ?? 0,
    })),
  };
}
