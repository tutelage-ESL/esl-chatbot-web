import OpenAI from "openai";
import { env } from "../../../config/env.ts";
import type { AIResponse, ConversationMessage, LearnerContext } from "../ai.types.ts";
import type { Plan } from "@prisma/client";

// FREE and GOLD: temporary OpenAI placeholders — pending migration to Gemini provider (see docs/ai-providers/llm.md)
const MODEL_BY_PLAN: Record<Plan, string> = {
  FREE: "gpt-4o-mini",
  GOLD: "gpt-4.1",
  PREMIUM: "gpt-5-mini",
};

function buildSystemPrompt(learner: LearnerContext | null): string {
  const level = learner?.currentLevel ?? "unknown";
  const target = learner?.targetLevel ?? "not specified";
  const purpose = learner?.learningPurpose ?? "general English improvement";
  const personality = learner?.aiPersonality ?? "friendly and encouraging";

  return `You are an expert ESL (English as a Second Language) tutor. Be ${personality}.

Student profile:
- Current level: ${level}
- Target level: ${target}
- Learning purpose: ${purpose}

Your task for each student message:
1. Respond naturally and conversationally (~50-100 words). Adapt your vocabulary to slightly above the student's current level.
2. Evaluate their English objectively.

Return ONLY valid JSON — no markdown, no code fences — in exactly this structure:
{
  "reply": "Your natural tutor response here",
  "evaluation": {
    "grammarScore": <integer 0-100>,
    "grammarErrors": [
      {"error": "description of error", "correction": "corrected text", "rule": "grammar rule name", "severity": "minor|major|critical"}
    ],
    "vocabularyScore": <integer 0-100>,
    "vocabularyLevel": "<A1|A2|B1|B2|C1|C2 — CEFR level of vocabulary used>",
    "fluencyScore": <integer 0-100>,
    "overallScore": <integer — MUST equal round(grammarScore*0.35 + vocabularyScore*0.35 + fluencyScore*0.30)>,
    "detectedCefrLevel": "<A1|A2|B1|B2|C1|C2 — inferred from overall writing complexity>",
    "corrections": [
      {"original": "exact text from student", "corrected": "corrected version", "explanation": "brief explanation"}
    ],
    "feedback": "One sentence of specific encouragement + one actionable tip"
  }
}

Scoring guide:
- grammarScore: 100 = flawless, 70 = minor errors, 50 = notable errors, 30 = significant errors
- vocabularyScore: 100 = rich and precise for context, 70 = adequate, 50 = basic, 30 = very limited
- fluencyScore: 100 = natural varied sentences, 70 = clear but simple, 50 = halting or repetitive
- Keep grammarErrors and corrections arrays empty [] if there are no errors — never fabricate errors`;
}

export async function callOpenAILLM(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  learner: LearnerContext | null,
  plan: Plan,
): Promise<AIResponse> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = MODEL_BY_PLAN[plan];

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(learner) },
    ...conversationHistory.slice(-20).map((m) => ({
      role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const completion = await client.chat.completions.create({
    model,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 1000,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned empty response");
  }

  let parsed: AIResponse;
  try {
    parsed = JSON.parse(raw) as AIResponse;
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  // Validate required fields exist
  if (!parsed.reply || !parsed.evaluation) {
    throw new Error("OpenAI response missing required fields");
  }

  return parsed;
}
