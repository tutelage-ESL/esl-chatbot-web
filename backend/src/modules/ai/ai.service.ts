import { env } from "../../config/env.ts";
import { AppError } from "../../utils/AppError.ts";
import { Sentry } from "../../config/sentry.ts";
import { logger } from "../../config/logger.ts";
import { callGeminiLLM, DEV_FALLBACK_MODEL } from "./providers/gemini.llm.ts";
import { callOpenAILLM } from "./providers/openai.llm.ts";
import { edgeTTS } from "./providers/edge.tts.ts";
import { azureTTS } from "./providers/azure.tts.ts";
import { openaiTTS } from "./providers/openai.tts.ts";
import { deepgramSTT } from "./providers/deepgram.stt.ts";
import { azureSTT } from "./providers/azure.stt.ts";
import { sanitizeAiReply, htmlToPlainText } from "../../utils/aiReplyFormat.ts";
import type { AIResponse, ConversationMessage, LearnerContext, MessageEvaluationResult, ReplyOptions, STTResult } from "./ai.types.ts";
import type { Plan } from "@prisma/client";
import { DEFAULT_TUTOR_VOICE, microsoftVoice, OPENAI_VOICE, type TutorVoiceChoice } from "./voices.ts";

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
    reply: `<p>[AI Placeholder] Your message was received. Set GEMINI_API_KEY to get real tutoring responses.</p>`,
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
  opts: ReplyOptions = {},
): Promise<AIResponse> {
  const result = await generateAIResponseRaw(userMessage, conversationHistory, learner, plan, opts).catch((err) => {
    // Every fallback was busy too: say so in words, not the internal sentinel.
    if (err instanceof Error && err.message === "AI_CAPACITY_OVERLOAD") {
      throw new AppError("The AI tutor is busy right now. Please try again in a moment.", 503);
    }
    throw err;
  });
  // The LLM's JSON is unvalidated — sanitize once here so every caller gets it
  // for free (see sanitizeAiReply for the rationale). The evaluation's text
  // fields are rendered with escaped interpolation (coach pane, vocab deck), so
  // any HTML the model bleeds into them must be stripped to plain text.
  return {
    ...result,
    reply: sanitizeAiReply(result.reply),
    evaluation: cleanEvaluation(result.evaluation),
  };
}

// Strip HTML from every model-authored text field of the evaluation. The prompt
// trains the model to emit tags in `reply`, and that formatting habit bleeds
// into feedback/corrections; these fields must stay plain text.
function cleanEvaluation(evaluation: MessageEvaluationResult): MessageEvaluationResult {
  const text = (v: string): string => (typeof v === "string" ? htmlToPlainText(v) : v);
  return {
    ...evaluation,
    feedback: text(evaluation.feedback ?? ""),
    grammarErrors: (evaluation.grammarErrors ?? []).map((g) => ({
      ...g,
      error: text(g.error),
      correction: text(g.correction),
      rule: text(g.rule),
    })),
    corrections: (evaluation.corrections ?? []).map((c) => ({
      ...c,
      original: text(c.original),
      corrected: text(c.corrected),
      explanation: text(c.explanation),
    })),
    newWords: (evaluation.newWords ?? []).map((w) => ({
      ...w,
      word: text(w.word),
      definition: text(w.definition),
      partOfSpeech: w.partOfSpeech ? text(w.partOfSpeech) : w.partOfSpeech,
      example: w.example ? text(w.example) : w.example,
    })),
  };
}

async function generateAIResponseRaw(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  learner: LearnerContext | null,
  plan: Plan,
  opts: ReplyOptions,
): Promise<AIResponse> {
  // No API keys at all — return heuristic placeholder
  if (!env.GEMINI_API_KEY && !env.OPENAI_API_KEY) {
    return heuristicResponse(userMessage);
  }

  // Development: all plans use the Gemini free tier.

  if (isDev) {
    if (!env.GEMINI_API_KEY) return heuristicResponse(userMessage);
    // Dev goes straight to Lite: Flash on the free key hangs or is overloaded nearly every
    // time (measured 2026-11-19), so trying it first only added 12s+ to every reply.
    // shortcut: dev never exercises Flash; switch back to DEV_MODEL first once the key is paid.
    return callGeminiLLM(userMessage, conversationHistory, learner, plan, false, DEV_FALLBACK_MODEL, opts);
  }

  // Production PREMIUM: GPT-5 mini with automatic Gemini fallback on error
  if (plan === "PREMIUM") {
    if (env.OPENAI_API_KEY) {
      try {
        return await callOpenAILLM(userMessage, conversationHistory, learner, opts);
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
          return callGeminiLLM(userMessage, conversationHistory, learner, plan, false, undefined, opts);
        }
      }
    } else if (env.GEMINI_API_KEY) {
      // No OpenAI key in prod — use Gemini as PREMIUM fallback
      return callGeminiLLM(userMessage, conversationHistory, learner, plan, false, undefined, opts);
    }
  }

  // Production FREE / GOLD → Gemini primary, OpenAI as LAST-resort fallback.
  // Gemini can fail hard from the server's datacenter IP ("User location is not
  // supported") — a request-origin geo-block that no key change fixes. Rather than
  // 500 the user, fall back to OpenAI when it's configured. The fallback is logged
  // LOUDLY (Winston warn + Sentry warning) on purpose: silent fallback would mask
  // Gemini outages. If you do NOT see a "[AI] Gemini failed" line for a message,
  // Gemini served it directly.
  if (env.GEMINI_API_KEY) {
    try {
      return await callGeminiLLM(userMessage, conversationHistory, learner, plan, false, undefined, opts);
    } catch (err) {
      // An overloaded Flash drops to Lite first (a few seconds) rather than waiting on OpenAI's slower reply.
      if (plan !== "FREE" && err instanceof Error && err.message === "AI_CAPACITY_OVERLOAD") {
        try {
          return await callGeminiLLM(userMessage, conversationHistory, learner, plan, false, DEV_FALLBACK_MODEL, opts);
        } catch { /* fall through to OpenAI below */ }
      }
      if (!env.OPENAI_API_KEY) throw err; // no fallback available — surface the real error
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn(`[AI] Gemini failed for ${plan} tier — falling back to OpenAI. Reason: ${reason}`);
      Sentry.withScope((scope) => {
        scope.setLevel("warning");
        scope.setTag("ai.provider", "gemini");
        scope.setTag("ai.fallback", "openai");
        scope.setTag("ai.tier", plan);
        Sentry.captureException(err);
      });
      return await callOpenAILLM(userMessage, conversationHistory, learner, opts);
    }
  }

  return heuristicResponse(userMessage);
}

// TTS routing:
//   Development       → Edge TTS (msedge-tts npm, no key, dev-only)
//   FREE + GOLD prod  → Azure Neural TTS (AZURE_SPEECH_KEY, same key as STT)
//   PREMIUM prod      → OpenAI TTS-1-HD (OPENAI_API_KEY, same key as LLM); fallback to Azure
//   No TTS key        → returns empty Buffer (voice message still works, just no playback audio)
export async function generateTTS(text: string, plan: Plan, voice: TutorVoiceChoice = DEFAULT_TUTOR_VOICE): Promise<Buffer> {
  const msVoice = microsoftVoice(voice);
  // Replies are stored as HTML — always strip to plain text here (not at call
  // sites) so no future caller can accidentally make the tutor read tags aloud.
  text = htmlToPlainText(text);
  if (isDev) {
    try {
      return await edgeTTS(text, msVoice);
    } catch (err) {
      // Edge TTS is unofficial and breaks when Microsoft changes its token (it did in
      // 2026-11, fixed by msedge-tts 2.1.1). Use Azure if configured, else stay silent.
      console.warn("[TTS] Edge TTS failed in dev:", err instanceof Error ? err.message : err);
      if (env.AZURE_SPEECH_KEY) return azureTTS(text, msVoice).catch(() => Buffer.alloc(0));
      return Buffer.alloc(0);
    }
  }

  // OpenAI has no British voices: a British accent uses the Microsoft voice on every plan.
  if (plan === "PREMIUM" && voice.accent === "US" && env.OPENAI_API_KEY) {
    try {
      return await openaiTTS(text, OPENAI_VOICE[voice.gender]);
    } catch (err) {
      Sentry.withScope((scope) => {
        scope.setLevel("warning");
        scope.setTag("ai.provider", "openai-tts");
        scope.setTag("ai.fallback", "azure-tts");
        Sentry.captureException(err);
      });
      if (env.AZURE_SPEECH_KEY) return azureTTS(text, msVoice);
      throw err;
    }
  }

  if (env.AZURE_SPEECH_KEY) return azureTTS(text, msVoice);

  // No paid TTS provider configured — fall back to Edge TTS (keyless, unofficial,
  // no SLA) so the tutor isn't silent. Empty buffer only if that fails too.
  try {
    return await edgeTTS(text, msVoice);
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setLevel("warning");
      scope.setTag("ai.provider", "edge-tts");
      scope.setTag("ai.fallback", "silent");
      Sentry.captureException(err);
    });
    return Buffer.alloc(0);
  }
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
  language: "en-US" | "en-GB" = "en-US",
): Promise<STTResult> {
  const baseMime = (mimeType.split(";")[0] ?? mimeType).trim();
  const mp4 = baseMime === "audio/mp4"; // Safari — Azure SDK v1.50 has no AAC format tag

  // GOLD + PREMIUM → Azure with pronunciation (unless MP4, which Azure can't decode)
  if (!isDev && (plan === "GOLD" || plan === "PREMIUM") && env.AZURE_SPEECH_KEY && !mp4) {
    return azureSTT(audioBuffer, mimeType, plan as "GOLD" | "PREMIUM", language);
  }

  // Dev + FREE (+ GOLD/PREMIUM MP4 fallback) → Deepgram
  if (env.DEEPGRAM_API_KEY) {
    return deepgramSTT(audioBuffer, mimeType);
  }

  // Last resort: Azure even for Dev/FREE if Deepgram not set
  if (env.AZURE_SPEECH_KEY && !mp4) {
    return azureSTT(audioBuffer, mimeType, "GOLD", language);
  }

  throw new AppError("Speech-to-text service not configured. Add DEEPGRAM_API_KEY to Infisical.", 503);
}
 