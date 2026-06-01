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

  let response: Awaited<ReturnType<typeof client.models.generateContent>>;
  try {
    response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: buildSystemPrompt(learner),
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 2500,
      },
    });
  } catch (err) {
    // Extract a clean message from the Gemini SDK error (it embeds raw JSON in the message)
    const raw = err instanceof Error ? err.message : String(err);
    const isQuota = raw.includes("RESOURCE_EXHAUSTED") || raw.includes("quota") || raw.includes("429");
    if (isQuota) {
      throw new Error("AI quota exceeded — please try again in a few minutes.");
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
