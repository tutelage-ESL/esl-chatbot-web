import { env } from "../../config/env.ts";
import { callGeminiLLM } from "./providers/gemini.llm.ts";
import { callOpenAILLM } from "./providers/openai.llm.ts";
import type { AIResponse, ConversationMessage, LearnerContext } from "./ai.types.ts";
import type { Plan } from "@prisma/client";

const isDev = env.NODE_ENV === "development";

// Heuristic fallback — used when no AI API key is configured (e.g. first-time local setup)
function heuristicResponse(userMessage: string): AIResponse {
  const words = userMessage.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const hasCapitalStart = /^[A-Z]/.test(userMessage);
  const hasEndPunctuation = /[.!?]$/.test(userMessage);
  const avgWordLength =
    userMessage.replace(/[^a-zA-Z\s]/g, "").split(/\s+/).reduce((s, w) => s + w.length, 0) /
    Math.max(wordCount, 1);

  let grammarScore = 70;
  if (hasCapitalStart) grammarScore += 10;
  if (hasEndPunctuation) grammarScore += 10;
  if (wordCount > 5) grammarScore += 5;
  grammarScore = Math.min(grammarScore, 95);

  const vocabScore = Math.min(40 + avgWordLength * 8, 95);
  const fluencyScore = Math.min(50 + wordCount * 2, 95);
  const overallScore = Math.round(grammarScore * 0.35 + vocabScore * 0.35 + fluencyScore * 0.3);

  const cefrLevel =
    overallScore >= 90 ? "C2" :
    overallScore >= 80 ? "C1" :
    overallScore >= 70 ? "B2" :
    overallScore >= 60 ? "B1" :
    overallScore >= 45 ? "A2" : "A1";

  const vocabLevel =
    avgWordLength >= 7 ? "B2" : avgWordLength >= 5 ? "B1" : avgWordLength >= 4 ? "A2" : "A1";

  return {
    reply: `[AI Placeholder] Your message was received. Set GEMINI_API_KEY to get real tutoring responses.`,
    evaluation: {
      grammarScore,
      grammarErrors: hasCapitalStart && hasEndPunctuation
        ? []
        : [
            ...(!hasCapitalStart ? [{ error: "Sentence does not start with a capital letter", correction: userMessage.charAt(0).toUpperCase() + userMessage.slice(1), rule: "capitalization", severity: "minor" as const }] : []),
            ...(!hasEndPunctuation ? [{ error: "Missing end punctuation", correction: userMessage + ".", rule: "punctuation", severity: "minor" as const }] : []),
          ],
      vocabularyScore: Math.round(vocabScore),
      vocabularyLevel: vocabLevel,
      fluencyScore,
      overallScore,
      detectedCefrLevel: cefrLevel,
      corrections: [],
      feedback: overallScore >= 80
        ? "Excellent work! Your message is well-structured."
        : "Good effort! Keep practicing to improve your fluency.",
    },
  };
}

// LLM routing:
//   Development (all plans) → Gemini 2.5 Flash (free tier; switch to gemini-3-flash when GA)
//   FREE / GOLD production  → Gemini 2.5 Flash-Lite / 2.5 Flash
//   PREMIUM production      → GPT-5 mini (OpenAI), auto-falls back to Gemini 2.5 Flash on error
export async function generateAIResponse(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  learner: LearnerContext | null,
  plan: Plan,
): Promise<AIResponse> {
  // No API keys at all — return heuristic placeholder
  if (!env.GEMINI_API_KEY && !env.OPENAI_API_KEY) {
    return heuristicResponse(userMessage);
  }

  // Development: all plans use Gemini free tier
  if (isDev) {
    if (!env.GEMINI_API_KEY) return heuristicResponse(userMessage);
    return callGeminiLLM(userMessage, conversationHistory, learner, plan, true);
  }

  // Production PREMIUM: GPT-5 mini with automatic Gemini fallback on error
  if (plan === "PREMIUM") {
    if (env.OPENAI_API_KEY) {
      try {
        return await callOpenAILLM(userMessage, conversationHistory, learner);
      } catch (err) {
        // Auto-fallback: OpenAI failed — transparently switch to Gemini 2.5 Flash
        console.error("[AI] OpenAI failed, falling back to Gemini:", err instanceof Error ? err.message : err);
        if (env.GEMINI_API_KEY) {
          return callGeminiLLM(userMessage, conversationHistory, learner, plan, false);
        }
      }
    } else if (env.GEMINI_API_KEY) {
      // No OpenAI key in prod — use Gemini as PREMIUM fallback
      return callGeminiLLM(userMessage, conversationHistory, learner, plan, false);
    }
  }

  // Production FREE / GOLD → Gemini
  if (env.GEMINI_API_KEY) {
    return callGeminiLLM(userMessage, conversationHistory, learner, plan, false);
  }

  return heuristicResponse(userMessage);
}
 