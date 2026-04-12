import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import {
  FREE_MAX_MESSAGES_PER_SESSION,
  PREMIUM_MAX_MESSAGES_PER_SESSION,
  SOFT_LIMIT_BUFFER,
} from "../sessions/sessions.service.ts";
import type { SendMessageResult } from "./messages.types.ts";
import type { MessageType } from "@prisma/client";

// ── Send message (user → AI → evaluate → store) ──────────

export async function sendMessage(
  userId: string,
  sessionId: string,
  content: string,
  type: MessageType,
): Promise<SendMessageResult> {
  // Verify session ownership and status
  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      endedAt: true,
      messageCount: true,
      mode: true,
    },
  });

  if (!session || session.userId !== userId) {
    throw new AppError("Session not found", 404);
  }

  if (session.endedAt) {
    throw new AppError("Cannot send messages to an ended session", 409);
  }

  // Check message limits
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  });

  const maxMessages =
    subscription?.plan === "PREMIUM"
      ? PREMIUM_MAX_MESSAGES_PER_SESSION
      : FREE_MAX_MESSAGES_PER_SESSION;

  // Count only USER messages for the limit
  const userMessageCount = await prisma.message.count({
    where: { sessionId, role: "USER" },
  });

  if (userMessageCount >= maxMessages + SOFT_LIMIT_BUFFER) {
    throw new AppError(
      "Session message limit reached. Please end this session and start a new one.",
      429,
    );
  }

  // Get learner profile for AI context
  const learnerProfile = await prisma.learnerProfile.findUnique({
    where: { userId },
    select: { currentLevel: true, targetLevel: true, learningPurpose: true, aiPersonality: true },
  });

  // Get recent conversation history for AI context
  const recentMessages = await prisma.message.findMany({
    where: { sessionId },
    select: { role: true, content: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  // Call AI for response + evaluation
  const aiResult = await getAIResponse(
    content,
    recentMessages,
    learnerProfile,
    session.mode,
  );

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const aiWordCount = aiResult.reply.split(/\s+/).filter(Boolean).length;

  // Store user message, AI response, and evaluation in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create user message
    const userMsg = await tx.message.create({
      data: {
        userId,
        sessionId,
        role: "USER",
        type,
        content,
        wordCount,
      },
      select: { id: true, role: true, type: true, content: true, wordCount: true, createdAt: true },
    });

    // 2. Create message evaluation for the user message
    const evaluation = await tx.messageEvaluation.create({
      data: {
        messageId: userMsg.id,
        grammarScore: aiResult.evaluation.grammarScore,
        grammarErrors: aiResult.evaluation.grammarErrors,
        vocabularyScore: aiResult.evaluation.vocabularyScore,
        vocabularyLevel: aiResult.evaluation.vocabularyLevel,
        fluencyScore: aiResult.evaluation.fluencyScore,
        overallScore: aiResult.evaluation.overallScore,
        detectedCefrLevel: aiResult.evaluation.detectedCefrLevel,
        corrections: aiResult.evaluation.corrections,
        feedback: aiResult.evaluation.feedback,
      },
      select: {
        grammarScore: true,
        grammarErrors: true,
        vocabularyScore: true,
        vocabularyLevel: true,
        fluencyScore: true,
        overallScore: true,
        detectedCefrLevel: true,
        corrections: true,
        feedback: true,
      },
    });

    // 3. Create assistant message
    const assistantMsg = await tx.message.create({
      data: {
        userId,
        sessionId,
        role: "ASSISTANT",
        type: "TEXT",
        content: aiResult.reply,
        wordCount: aiWordCount,
      },
      select: { id: true, role: true, type: true, content: true, wordCount: true, createdAt: true },
    });

    // 4. Update session message count
    const totalMessages = await tx.message.count({ where: { sessionId } });
    await tx.conversationSession.update({
      where: { id: sessionId },
      data: { messageCount: totalMessages },
    });

    return {
      userMessage: userMsg as SendMessageResult["userMessage"],
      assistantMessage: assistantMsg as SendMessageResult["assistantMessage"],
      evaluation,
    };
  });

  // Return soft limit warning in the response if approaching limit
  const newUserCount = userMessageCount + 1;
  if (newUserCount >= maxMessages) {
    // The controller can check this and add a warning header
  }

  return result;
}

// ── List messages for a session ───────────────────────────

export async function listMessages(
  userId: string,
  sessionId: string,
  page: number,
  limit: number,
) {
  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });

  if (!session || session.userId !== userId) {
    throw new AppError("Session not found", 404);
  }

  const skip = (page - 1) * limit;

  const [messages, total] = await prisma.$transaction([
    prisma.message.findMany({
      where: { sessionId },
      select: {
        id: true,
        role: true,
        type: true,
        content: true,
        wordCount: true,
        audioUrl: true,
        audioDurationSec: true,
        createdAt: true,
        evaluation: {
          select: {
            grammarScore: true,
            grammarErrors: true,
            vocabularyScore: true,
            vocabularyLevel: true,
            fluencyScore: true,
            pronunciationScore: true,
            pronunciationIssues: true,
            overallScore: true,
            detectedCefrLevel: true,
            corrections: true,
            feedback: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.message.count({ where: { sessionId } }),
  ]);

  return { messages, total };
}

// ── AI Integration (placeholder) ──────────────────────────
//
// This is a placeholder that generates realistic mock evaluations.
// Replace with real AI API calls (OpenAI, Claude, etc.) when ready.
// The interface is designed so the swap is a single-function replacement.

interface AIResponse {
  reply: string;
  evaluation: {
    grammarScore: number;
    grammarErrors: Array<{ error: string; correction: string; rule: string; severity: string }>;
    vocabularyScore: number;
    vocabularyLevel: string;
    fluencyScore: number;
    overallScore: number;
    detectedCefrLevel: string;
    corrections: Array<{ original: string; corrected: string; explanation: string }>;
    feedback: string;
  };
}

async function getAIResponse(
  userMessage: string,
  _conversationHistory: Array<{ role: string; content: string }>,
  _learnerProfile: { currentLevel: string | null; targetLevel: string | null; learningPurpose: string | null; aiPersonality: string | null } | null,
  _sessionMode: string,
): Promise<AIResponse> {
  // ──────────────────────────────────────────────────────────
  // TODO: Replace this placeholder with a real AI API call.
  //
  // The real implementation should:
  // 1. Build a system prompt from learnerProfile (level, personality, purpose)
  // 2. Send conversation history + new message to the LLM
  // 3. Ask the LLM to respond naturally AND evaluate the user's message
  // 4. Parse the structured evaluation from the LLM response
  //
  // Expected AI response format (instruct the LLM to return JSON):
  // {
  //   "reply": "Natural conversational response...",
  //   "evaluation": { grammarScore, grammarErrors, ... }
  // }
  // ──────────────────────────────────────────────────────────

  const wordCount = userMessage.split(/\s+/).filter(Boolean).length;

  // Simple heuristic-based mock evaluation
  const hasCapitalStart = /^[A-Z]/.test(userMessage);
  const hasEndPunctuation = /[.!?]$/.test(userMessage);
  const avgWordLength =
    userMessage.replace(/[^a-zA-Z\s]/g, "").split(/\s+/).reduce((s, w) => s + w.length, 0) /
    Math.max(wordCount, 1);

  let grammarScore = 70;
  if (hasCapitalStart) grammarScore += 10;
  if (hasEndPunctuation) grammarScore += 10;
  if (wordCount > 5) grammarScore += 5;
  grammarScore = Math.min(grammarScore, 100);

  let vocabScore = Math.min(40 + avgWordLength * 8, 95);
  const fluencyScore = Math.min(50 + wordCount * 2, 95);
  const overallScore = Math.round(grammarScore * 0.35 + vocabScore * 0.35 + fluencyScore * 0.3);

  const cefrLevel =
    overallScore >= 90 ? "C2" :
    overallScore >= 80 ? "C1" :
    overallScore >= 70 ? "B2" :
    overallScore >= 60 ? "B1" :
    overallScore >= 45 ? "A2" : "A1";

  const vocabLevel =
    avgWordLength >= 7 ? "B2" :
    avgWordLength >= 5 ? "B1" :
    avgWordLength >= 4 ? "A2" : "A1";

  const grammarErrors: AIResponse["evaluation"]["grammarErrors"] = [];
  const corrections: AIResponse["evaluation"]["corrections"] = [];

  if (!hasCapitalStart) {
    grammarErrors.push({
      error: "Sentence does not start with a capital letter",
      correction: userMessage.charAt(0).toUpperCase() + userMessage.slice(1),
      rule: "capitalization",
      severity: "minor",
    });
    corrections.push({
      original: userMessage.slice(0, 20),
      corrected: userMessage.charAt(0).toUpperCase() + userMessage.slice(1, 20),
      explanation: "Sentences should start with a capital letter.",
    });
  }

  if (!hasEndPunctuation) {
    grammarErrors.push({
      error: "Missing end punctuation",
      correction: userMessage + ".",
      rule: "punctuation",
      severity: "minor",
    });
  }

  const feedback =
    overallScore >= 80
      ? "Excellent work! Your message is well-structured and clear."
      : overallScore >= 60
        ? "Good effort! There are a few areas to improve, but you're communicating effectively."
        : "Keep practicing! Focus on the corrections above to improve your grammar and fluency.";

  return {
    reply: `[AI Placeholder] Thank you for your message! I received: "${userMessage.slice(0, 50)}${userMessage.length > 50 ? "..." : ""}". This is a placeholder response — connect a real AI provider to get natural tutoring responses.`,
    evaluation: {
      grammarScore,
      grammarErrors,
      vocabularyScore: Math.round(vocabScore),
      vocabularyLevel: vocabLevel,
      fluencyScore,
      overallScore,
      detectedCefrLevel: cefrLevel,
      corrections,
      feedback,
    },
  };
}
