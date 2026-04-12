import type { Prisma, SessionMode } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import type {
  SessionListItem,
  SessionDetail,
  SessionEvaluationData,
} from "./sessions.types.ts";

// ── Constants ─────────────────────────────────────────────

const FREE_MAX_SESSIONS_PER_DAY = 3;
const PREMIUM_MAX_SESSIONS_PER_DAY = 50;
const FREE_MAX_MESSAGES_PER_SESSION = 50;
const PREMIUM_MAX_MESSAGES_PER_SESSION = 150;
const SOFT_LIMIT_BUFFER = 10;

export { FREE_MAX_MESSAGES_PER_SESSION, PREMIUM_MAX_MESSAGES_PER_SESSION, SOFT_LIMIT_BUFFER };

// ── Create session ────────────────────────────────────────

export async function createSession(
  userId: string,
  mode: SessionMode,
  topic?: string | null,
): Promise<SessionListItem> {
  // Check subscription — AI chatbot access requires ACTIVE subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, plan: true },
  });

  if (!subscription || subscription.status !== "ACTIVE") {
    throw new AppError("Active subscription required to start a conversation", 403);
  }

  // Enforce daily session cap
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sessionsToday = await prisma.conversationSession.count({
    where: {
      userId,
      startedAt: { gte: todayStart },
    },
  });

  const maxSessions =
    subscription.plan === "PREMIUM"
      ? PREMIUM_MAX_SESSIONS_PER_DAY
      : FREE_MAX_SESSIONS_PER_DAY;

  if (sessionsToday >= maxSessions) {
    throw new AppError(
      `Daily session limit reached (${maxSessions}). Upgrade to Premium for more sessions.`,
      429,
    );
  }

  const session = await prisma.conversationSession.create({
    data: {
      userId,
      mode,
      topic: topic ?? null,
    },
    select: SESSION_LIST_SELECT,
  });

  return session;
}

// ── List sessions ─────────────────────────────────────────

const SESSION_LIST_SELECT = {
  id: true,
  mode: true,
  topic: true,
  summary: true,
  startedAt: true,
  endedAt: true,
  durationSeconds: true,
  messageCount: true,
  averageScore: true,
  createdAt: true,
} satisfies Prisma.ConversationSessionSelect;

export async function listSessions(
  userId: string,
  page: number,
  limit: number,
  mode?: SessionMode,
  active?: boolean,
): Promise<{ sessions: SessionListItem[]; total: number }> {
  const where: Prisma.ConversationSessionWhereInput = { userId };
  if (mode) where.mode = mode;
  if (active === true) where.endedAt = null;
  if (active === false) where.endedAt = { not: null };

  const skip = (page - 1) * limit;

  const [sessions, total] = await prisma.$transaction([
    prisma.conversationSession.findMany({
      where,
      select: SESSION_LIST_SELECT,
      orderBy: { startedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.conversationSession.count({ where }),
  ]);

  return { sessions, total };
}

// ── Get session detail ────────────────────────────────────

export async function getSessionById(
  sessionId: string,
  userId: string,
): Promise<SessionDetail> {
  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      mode: true,
      topic: true,
      summary: true,
      aiContextSnapshot: true,
      startedAt: true,
      endedAt: true,
      durationSeconds: true,
      messageCount: true,
      averageScore: true,
      createdAt: true,
      messages: {
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
      },
      evaluation: {
        select: {
          topicsCovered: true,
          avgGrammarScore: true,
          avgVocabularyScore: true,
          avgFluencyScore: true,
          avgOverallScore: true,
          detectedCefrLevel: true,
          strengths: true,
          weaknesses: true,
          recommendations: true,
          newVocabulary: true,
          totalUserMessages: true,
          totalUserWords: true,
        },
      },
    },
  });

  if (!session || session.userId !== userId) {
    throw new AppError("Session not found", 404);
  }

  return session;
}

// ── End session ───────────────────────────────────────────

export async function endSession(
  sessionId: string,
  userId: string,
): Promise<SessionDetail> {
  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      startedAt: true,
      endedAt: true,
      messages: {
        where: { role: "USER" },
        select: {
          wordCount: true,
          evaluation: {
            select: {
              grammarScore: true,
              vocabularyScore: true,
              fluencyScore: true,
              overallScore: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.userId !== userId) {
    throw new AppError("Session not found", 404);
  }

  if (session.endedAt) {
    throw new AppError("Session is already ended", 409);
  }

  const endedAt = new Date();
  const durationSeconds = Math.round(
    (endedAt.getTime() - session.startedAt.getTime()) / 1000,
  );

  // Compute averages from message evaluations
  const evaluatedMessages = session.messages.filter((m) => m.evaluation);
  const avgScore =
    evaluatedMessages.length > 0
      ? evaluatedMessages.reduce((sum, m) => sum + (m.evaluation?.overallScore ?? 0), 0) /
        evaluatedMessages.length
      : null;

  const totalMessages = await prisma.message.count({
    where: { sessionId },
  });

  await prisma.conversationSession.update({
    where: { id: sessionId },
    data: {
      endedAt,
      durationSeconds,
      messageCount: totalMessages,
      averageScore: avgScore,
    },
  });

  // Generate a session evaluation summary from individual message evaluations
  if (evaluatedMessages.length > 0) {
    const totalUserMessages = evaluatedMessages.length;
    const totalUserWords = session.messages.reduce(
      (sum, m) => sum + (m.wordCount ?? 0),
      0,
    );

    const avgGrammar =
      evaluatedMessages.reduce((s, m) => s + (m.evaluation?.grammarScore ?? 0), 0) /
      totalUserMessages;
    const avgVocab =
      evaluatedMessages.reduce((s, m) => s + (m.evaluation?.vocabularyScore ?? 0), 0) /
      totalUserMessages;
    const avgFluency =
      evaluatedMessages.reduce((s, m) => s + (m.evaluation?.fluencyScore ?? 0), 0) /
      totalUserMessages;
    const avgOverall =
      evaluatedMessages.reduce((s, m) => s + (m.evaluation?.overallScore ?? 0), 0) /
      totalUserMessages;

    // Determine CEFR level from average overall score
    const cefrLevel = scoreTocefrLevel(avgOverall);

    // Build strengths/weaknesses from score analysis
    const scores = { grammar: avgGrammar, vocabulary: avgVocab, fluency: avgFluency };
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    for (const [skill, score] of Object.entries(scores)) {
      if (score >= 75) strengths.push(`Strong ${skill} skills`);
      else if (score < 50) weaknesses.push(`${skill} needs improvement`);
    }

    await prisma.sessionEvaluation.create({
      data: {
        sessionId,
        topicsCovered: [],
        avgGrammarScore: Math.round(avgGrammar * 10) / 10,
        avgVocabularyScore: Math.round(avgVocab * 10) / 10,
        avgFluencyScore: Math.round(avgFluency * 10) / 10,
        avgOverallScore: Math.round(avgOverall * 10) / 10,
        detectedCefrLevel: cefrLevel,
        strengths,
        weaknesses,
        recommendations: weaknesses.map(
          (w) => `Focus on improving ${w.replace(" needs improvement", "")}`,
        ),
        newVocabulary: [],
        totalUserMessages,
        totalUserWords,
      },
    });
  }

  return getSessionById(sessionId, userId);
}

// ── Helpers ───────────────────────────────────────────────

function scoreTocefrLevel(score: number): string {
  if (score >= 90) return "C2";
  if (score >= 80) return "C1";
  if (score >= 70) return "B2";
  if (score >= 60) return "B1";
  if (score >= 45) return "A2";
  return "A1";
}
