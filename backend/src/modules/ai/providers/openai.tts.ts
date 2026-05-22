import OpenAI from "openai";
import { env } from "../../../config/env.ts";

// PREMIUM production TTS — OpenAI TTS-1-HD
// Same OPENAI_API_KEY as LLM — no extra key or resource needed
// Voice: "nova" (warm, encouraging — good for ESL beginners and intermediate learners)
// Speed: 0.95 (slightly slower than default — measurably better ESL comprehension, not unnatural)
// Cost: $30/1M chars. No free tier.
const MODEL = "tts-1-hd";
const VOICE = "nova" as const;
const SPEED = 0.95;

export async function openaiTTS(text: string): Promise<Buffer> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const response = await client.audio.speech.create({
    model: MODEL,
    voice: VOICE,
    input: text,
    response_format: "mp3",
    speed: SPEED,
  });

  return Buffer.from(await response.arrayBuffer());
}
