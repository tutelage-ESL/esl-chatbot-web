import { env } from "../../config/env.ts";
import { AppError } from "../../utils/AppError.ts";
import { Sentry } from "../../config/sentry.ts";
import { callGeminiLLM, DEV_FALLBACK_MODEL } from "./providers/gemini.llm.ts";
import { callOpenAILLM } from "./providers/openai.llm.ts";
import { edgeTTS } from "./providers/edge.tts.ts";
import { azureTTS } from "./providers/azure.tts.ts";
import { openaiTTS } from "./providers/openai.tts.ts";
import { deepgramSTT } from "./providers/deepgram.stt.ts";
import { azureSTT } from "./providers/azure.stt.ts";
import type { AIResponse, ConversationMessage, LearnerContext, STTResult } from "./ai.types.ts";
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
      newWords: [],
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

  // Development: all plans use Gemini free tier (gemini-flash-latest / gemini-3-flash-preview).
  // If that preview model is overloaded, automatically retry with the stable DEV_FALLBACK_MODEL.
  if (isDev) {
    if (!env.GEMINI_API_KEY) return heuristicResponse(userMessage);
    try {
      return await callGeminiLLM(userMessage, conversationHistory, learner, plan, true);
    } catch (err) {
      if (err instanceof Error && err.message === "AI_CAPACITY_OVERLOAD") {
        console.warn(`[AI] gemini-flash-latest overloaded — retrying with ${DEV_FALLBACK_MODEL}`);
        return callGeminiLLM(userMessage, conversationHistory, learner, plan, false, DEV_FALLBACK_MODEL);
      }
      throw err;
    }
  }

  // Production PREMIUM: GPT-5 mini with automatic Gemini fallback on error
  if (plan === "PREMIUM") {
    if (env.OPENAI_API_KEY) {
      try {
        return await callOpenAILLM(userMessage, conversationHistory, learner);
      } catch (err) {
        // Auto-fallback: OpenAI failed — transparently switch to Gemini 2.5 Flash.
        // Reported as a warning (not error) because the user still gets a response.
        Sentry.withScope((scope) => {
          scope.setLevel("warning");
          scope.setTag("ai.provider", "openai");
          scope.setTag("ai.fallback", "gemini");
          Sentry.captureException(err);
        });
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

// TTS routing:
//   Development       → Edge TTS (msedge-tts npm, no key, dev-only)
//   FREE + GOLD prod  → Azure Neural TTS (AZURE_SPEECH_KEY, same key as STT)
//   PREMIUM prod      → OpenAI TTS-1-HD (OPENAI_API_KEY, same key as LLM); fallback to Azure
//   No TTS key        → returns empty Buffer (voice message still works, just no playback audio)
export async function generateTTS(text: string, plan: Plan): Promise<Buffer> {
  if (isDev) {
    try {
      return await edgeTTS(text);
    } catch (err) {
      // Edge TTS is dev-only and can fail (unofficial endpoint) — non-fatal in dev
      console.warn("[TTS] Edge TTS failed in dev, returning empty buffer:", err instanceof Error ? err.message : err);
      return Buffer.alloc(0);
    }
  }

  if (plan === "PREMIUM" && env.OPENAI_API_KEY) {
    try {
      return await openaiTTS(text);
    } catch (err) {
      Sentry.withScope((scope) => {
        scope.setLevel("warning");
        scope.setTag("ai.provider", "openai-tts");
        scope.setTag("ai.fallback", "azure-tts");
        Sentry.captureException(err);
      });
      if (env.AZURE_SPEECH_KEY) return azureTTS(text);
      throw err;
    }
  }

  if (env.AZURE_SPEECH_KEY) return azureTTS(text);

  // No TTS provider configured — voice message still processes (STT + LLM), just no AI audio
  return Buffer.alloc(0);
}

// STT routing:
//   Development       → Deepgram Nova-3 (DEEPGRAM_API_KEY, $200 free credit)
//   FREE prod         → Deepgram Nova-3
//   GOLD prod         → Azure Speech + Pronunciation (basic: accuracy/fluency/completeness)
//   PREMIUM prod      → Azure Speech + Pronunciation (full: + prosody score)
//   audio/mp4 (Safari)→ falls back to Deepgram regardless of plan (Azure SDK lacks AAC support)
//   No STT key        → throws 503 (voice messages require STT)
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  plan: Plan,
): Promise<STTResult> {
  const baseMime = (mimeType.split(";")[0] ?? mimeType).trim();
  const mp4 = baseMime === "audio/mp4"; // Safari — Azure SDK v1.50 has no AAC format tag

  // GOLD + PREMIUM → Azure with pronunciation (unless MP4, which Azure can't decode)
  if (!isDev && (plan === "GOLD" || plan === "PREMIUM") && env.AZURE_SPEECH_KEY && !mp4) {
    return azureSTT(audioBuffer, mimeType, plan as "GOLD" | "PREMIUM");
  }

  // Dev + FREE (+ GOLD/PREMIUM MP4 fallback) → Deepgram
  if (env.DEEPGRAM_API_KEY) {
    return deepgramSTT(audioBuffer, mimeType);
  }

  // Last resort: Azure even for Dev/FREE if Deepgram not set
  if (env.AZURE_SPEECH_KEY && !mp4) {
    return azureSTT(audioBuffer, mimeType, "GOLD");
  }

  throw new AppError("Speech-to-text service not configured. Add DEEPGRAM_API_KEY to Infisical.", 503);
}
 