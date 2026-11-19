import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { env } from "../../../config/env.ts";
import { buildSystemPrompt } from "./prompt.ts";
import type { AIResponse, ConversationMessage, LearnerContext, ReplyOptions } from "../ai.types.ts";
import type { Plan } from "@prisma/client";

// All tiers use Google's rolling aliases, not pinned IDs: pinned 2.5 models returned
// 404 "no longer available to new users" for API keys created after mid-2026 (broke prod
// 2026-07-17). The aliases track the current lite/standard Flash tier automatically.
// FREE → "gemini-flash-lite-latest" · GOLD → "gemini-flash-latest" · PREMIUM fallback → "gemini-flash-latest"
const GEMINI_MODEL_BY_PLAN: Record<Plan, string> = {
  FREE: "gemini-flash-lite-latest", // cheapest tier alias (currently resolves to gemini-3.1-flash-lite)
  GOLD: "gemini-flash-latest",      // standard Flash tier alias
  PREMIUM: "gemini-flash-latest",   // fallback only — normally PREMIUM uses OpenAI
};

// "gemini-flash-latest" resolves to the latest available Flash model.
// Preview models can hit capacity limits — DEV_FALLBACK_MODEL is used when DEV_MODEL is overloaded.
const DEV_MODEL = "gemini-flash-latest";
export const DEV_FALLBACK_MODEL = "gemini-flash-lite-latest";

// Free-tier Lite answers a call turn in 1.7-9s (measured 2026-11); an overloaded Flash can
// hang for minutes. Flash gets a short limit because Lite is behind it; Lite is the last try.
const SPOKEN_TIMEOUT_MS = { flash: 8_000, lite: 15_000 };
// Typed chat: a healthy Flash answers in a few seconds; on the free key it hangs (measured 2026-11-19: 40s
// with no answer), so it gets 12s before Lite takes over. Lite answers in 2-6s and is the last try.
const TEXT_TIMEOUT_MS = { flash: 12_000, lite: 30_000 };

export async function callGeminiLLM(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  learner: LearnerContext | null,
  plan: Plan,
  isDev = false,
  modelOverride?: string,
  opts: ReplyOptions = {},
): Promise<AIResponse> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const model = modelOverride ?? (isDev ? DEV_MODEL : GEMINI_MODEL_BY_PLAN[plan]);

  // Gemini uses "model" for assistant role (not "assistant")
  const contents = [
    ...conversationHistory.map((m) => ({
      role: m.role === "USER" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  let response: Awaited<ReturnType<typeof client.models.generateContent>>;
  try {
    response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: buildSystemPrompt(learner, opts),
        // A chat reply needs little reasoning, so think as little as the model allows (measured: Lite
        // 2.2s -> 1.5s). Gemini 3 Flash rejects MINIMAL, so it gets LOW.
        thinkingConfig: { thinkingLevel: model.includes("lite") ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW },
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 2500,
        // An overloaded Flash can hang for minutes (measured 2026-11); give up and fall back.
        abortSignal: AbortSignal.timeout(
          (opts.spoken ? SPOKEN_TIMEOUT_MS : TEXT_TIMEOUT_MS)[model.includes("lite") ? "lite" : "flash"],
        ),
      },
    });
  } catch (err) {
    // Extract a clean message from the Gemini SDK error (it embeds raw JSON in the message)
    const raw = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError" || raw.toLowerCase().includes("abort"))) {
      throw new Error("AI_CAPACITY_OVERLOAD");
    }
    const isQuota = raw.includes("RESOURCE_EXHAUSTED") || raw.includes("quota") || raw.includes("429");
    if (isQuota) {
      throw new Error("AI quota exceeded — please try again in a few minutes.");
    }
    // Preview models (gemini-flash-latest → gemini-3-flash-preview) can report capacity errors.
    // Throw a sentinel so the caller (ai.service.ts) can retry with a stable fallback model.
    const isCapacity =
      raw.toLowerCase().includes("high demand") ||
      raw.toLowerCase().includes("overloaded") ||
      raw.includes("503") ||
      raw.toLowerCase().includes("temporarily unavailable");
    if (isCapacity) {
      throw new Error("AI_CAPACITY_OVERLOAD");
    }
    // Try to surface a clean message from the embedded JSON
    try {
      const jsonStart = raw.indexOf("{");
      if (jsonStart !== -1) {
        const parsed = JSON.parse(raw.slice(jsonStart));
        const msg: string = parsed?.error?.message ?? raw;
        throw new Error(`AI error: ${msg.split("\n")[0]?.slice(0, 120)}`);
      }
    } catch (e) {
      if (e instanceof Error && !e.message.startsWith("AI error:") === false) throw e;
    }
    throw new Error("AI service error. Please try again.");
  }

  const raw = response.text;
  if (!raw) {
    throw new Error("Gemini returned empty response");
  }

  // Strip markdown code fences in case the model wraps JSON despite responseMimeType instruction
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: AIResponse;
  try {
    parsed = JSON.parse(cleaned) as AIResponse;
  } catch {
    throw new Error(`Gemini returned invalid JSON (truncated or malformed). First 500 chars: ${cleaned.slice(0, 500)}`);
  }

  if (!parsed.reply || !parsed.evaluation) {
    throw new Error("Gemini response missing required fields");
  }

  return parsed;
}
