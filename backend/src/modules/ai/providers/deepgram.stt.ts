import { DeepgramClient } from "@deepgram/sdk";
import { env } from "../../../config/env.ts";
import type { STTResult } from "../ai.types.ts";

// Dev + FREE production STT — Deepgram Nova-3
const MODEL = "nova-3";

// Strip codec suffix so Deepgram accepts the content-type (e.g. "audio/webm;codecs=opus" → "audio/webm")
function baseMime(mimeType: string): string {
  return (mimeType.split(";")[0] ?? mimeType).trim();
}

export async function deepgramSTT(audioBuffer: Buffer, mimeType: string): Promise<STTResult> {
  if (!env.DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY not configured");
  }

  const client = new DeepgramClient({ apiKey: env.DEEPGRAM_API_KEY });

  // Use WithMetadata form: { data, contentType, contentLength }
  // This sets Content-Type correctly without relying on Blob constructor behaviour in Bun
  const response = await client.listen.v1.media.transcribeFile(
    {
      data: audioBuffer,
      contentType: baseMime(mimeType),
      contentLength: audioBuffer.length,
    },
    {
      model: MODEL,
      smart_format: true,
      language: "en",
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alternative = (response as any)?.results?.channels?.[0]?.alternatives?.[0];

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
