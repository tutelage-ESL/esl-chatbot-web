import { GoogleGenAI } from "@google/genai";
import { env } from "../../../config/env.ts";
import { buildSystemPrompt } from "./prompt.ts";
import type { AIResponse, ConversationMessage, LearnerContext } from "../ai.types.ts";
import type { Plan } from "@prisma/client";

// Dev → "gemini-flash-latest" alias (resolves to gemini-3-flash-preview; direct "gemini-3-flash" ID returns 404)
// FREE → "gemini-2.5-flash-lite" · GOLD → "gemini-2.5-flash" · PREMIUM fallback → "gemini-flash-latest"
// Production IDs: verify via ListModels if you get 404; same GEMINI_API_KEY for all tiers
const GEMINI_MODEL_BY_PLAN: Record<Plan, string> = {
  FREE: "gemini-2.5-flash-lite",   // cheapest stable model — verify via ListModels if 404
  GOLD: "gemini-2.5-flash",        // mid-tier — verify via ListModels if 404
  PREMIUM: "gemini-flash-latest",  // fallback only — normally PREMIUM uses OpenAI
};

// "gemini-flash-latest" resolves to the latest available Flash model (currently gemini-3-flash-preview)
// Confirmed working via curl. Switch to a pinned stable ID when gemini-3-flash reaches GA.
const DEV_MODEL = "gemini-flash-latest";

export async function callGeminiLLM(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  learner: LearnerContext | null,
  plan: Plan,
  isDev = false,
): Promise<AIResponse> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const model = isDev ? DEV_MODEL : GEMINI_MODEL_BY_PLAN[plan];

  // Gemini uses "model" for assistant role (not "assistant")
  const contents = [
    ...conversationHistory.map((m) => ({
      role: m.role === "USER" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  // TODO: add prompt caching for system instruction (75–90% token discount on repeated calls)
  const response = await client.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: buildSystemPrompt(learner),
      responseMimeType: "application/json",
      temperature: 0.7,
      // 1000 was too low — full JSON (reply + corrections array + grammarErrors array) needs ~1200-2000 tokens
      maxOutputTokens: 2500,
    },
  });

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
