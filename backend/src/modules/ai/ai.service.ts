import { env } from "../../config/env.ts";
import { callOpenAILLM } from "./providers/openai.llm.ts";
import type { AIResponse, ConversationMessage, LearnerContext } from "./ai.types.ts";
import type { Plan } from "@prisma/client";

// Heuristic fallback — used when OPENAI_API_KEY is not configured (dev without key)
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
    reply: `[AI Placeholder] Your message was received. Set OPENAI_API_KEY to get real tutoring responses.`,
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

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  learner: LearnerContext | null,
  plan: Plan,
): Promise<AIResponse> {
  if (!env.OPENAI_API_KEY) {
    return heuristicResponse(userMessage);
  }

  return callOpenAILLM(userMessage, conversationHistory, learner, plan);
}
