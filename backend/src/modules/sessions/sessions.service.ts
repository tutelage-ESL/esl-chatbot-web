import type { Prisma, SessionMode } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { deleteCache, cacheKeys } from "../../config/cache.ts";
import { AppError } from "../../utils/AppError.ts";
import { secondsUntilNextDay } from "../../utils/retryAfter.ts";
import { learnerDay, timezoneOf } from "../../utils/learnerDay.ts";
import { upsertSessionVocabulary } from "../vocabulary/vocabulary.service.ts";
import { mostCommonLevel } from "../metrics/skills.service.ts";
import type { NewVocabularyWord } from "../ai/ai.types.ts";
import type {
  SessionListItem,
  SessionDetail,
  SessionEvaluationData,
  SessionStatsData,
} from "./sessions.types.ts";

// ── Constants ─────────────────────────────────────────────

const FREE_MAX_SESSIONS_PER_DAY = 3;
const GOLD_MAX_SESSIONS_PER_DAY = 15;
const PREMIUM_MAX_SESSIONS_PER_DAY = 50;

const FREE_MAX_MESSAGES_PER_SESSION = 20;   // soft limit — warning shown
const GOLD_MAX_MESSAGES_PER_SESSION = 100;
const PREMIUM_MAX_MESSAGES_PER_SESSION = 150;

const FREE_MAX_MESSAGES_PER_DAY = 20;       // hard daily cap across all sessions

const SOFT_LIMIT_BUFFER = 10;               // extra messages allowed after soft limit before hard cutoff

export {
  FREE_MAX_SESSIONS_PER_DAY,
  GOLD_MAX_SESSIONS_PER_DAY,
  PREMIUM_MAX_SESSIONS_PER_DAY,
  FREE_MAX_MESSAGES_PER_SESSION,
  GOLD_MAX_MESSAGES_PER_SESSION,
  PREMIUM_MAX_MESSAGES_PER_SESSION,
  FREE_MAX_MESSAGES_PER_DAY,
  SOFT_LIMIT_BUFFER,
};

// ── Create session ────────────────────────────────────────

export async function createSession(
  userId: string,
  mode: SessionMode,
  topic?: string | null,
): Promise<SessionListItem> {
  // Check subscription — AI chatbot access requires ACTIVE subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, plan: true, currentPeriodEnd: true },
  });

  if (!subscription || subscription.status !== "ACTIVE") {
    throw new AppError("Active subscription required to start a conversation", 403);
  }

  // Lazy expiry: downgrade GOLD/PREMIUM to FREE ACTIVE when the period has ended
  let plan = subscription.plan;
  if (
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd < new Date() &&
    (plan === "GOLD" || plan === "PREMIUM")
  ) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        plan: "FREE",
        currentPeriodEnd: null,
        currentPeriodStart: null,
        paymentProvider: null,
        externalCustomerId: null,
        externalSubscriptionId: null,
        // Mirrors subscription-expiry.job.ts — the cancellation has taken effect.
        cancelAtPeriodEnd: false,
      },
    });
    plan = "FREE";
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
    plan === "PREMIUM"
      ? PREMIUM_MAX_SESSIONS_PER_DAY
      : plan === "GOLD"
        ? GOLD_MAX_SESSIONS_PER_DAY
        : FREE_MAX_SESSIONS_PER_DAY;

  if (sessionsToday >= maxSessions) {
    throw new AppError(
      `Daily session limit reached (${maxSessions}). Upgrade your plan for more sessions.`,
      429,
      { retryAfter: secondsUntilNextDay() },
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
  title: true,
  isPinned: true,
  summary: true,
  startedAt: true,
  endedAt: true,
  durationSeconds: true,
  messageCount: true,
  createdAt: true,
} satisfies Prisma.ConversationSessionSelect;

export async function listSessions(
  userId: string,
  page: number,
  limit: number,
  mode?: SessionMode,
  active?: boolean,
): Promise<{ sessions: SessionListItem[]; total: number }> {
  // A deleted chat is hidden here only: limits and tutor/admin stats still count it.
  const where: Prisma.ConversationSessionWhereInput = { userId, deletedAt: null };
  if (mode) where.mode = mode;
  if (active === true) where.endedAt = null;
  if (active === false) where.endedAt = { not: null };

  const skip = (page - 1) * limit;

  const [sessions, total] = await prisma.$transaction([
    prisma.conversationSession.findMany({
      where,
      select: SESSION_LIST_SELECT,
      orderBy: [{ isPinned: "desc" }, { startedAt: "desc" }],
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
      title: true,
      isPinned: true,
      deletedAt: true,
      summary: true,
      aiContextSnapshot: true,
      startedAt: true,
      endedAt: true,
      durationSeconds: true,
      messageCount: true,
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
          avgPronunciationScore: true,
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

  if (!session || session.userId !== userId || session.deletedAt) {
    throw new AppError("Session not found", 404);
  }

  const { deletedAt: _deletedAt, ...detail } = session;
  return detail;
}

// ── End session ───────────────────────────────────────────

export async function endSession(
  sessionId: string,
  userId: string,
): Promise<SessionDetail> {
  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, endedAt: true },
  });
  if (!session || session.userId !== userId) {
    throw new AppError("Session not found", 404);
  }
  if (session.endedAt) {
    throw new AppError("Session is already ended", 409);
  }
  await finalizeSession(sessionId);
  return getSessionById(sessionId, userId);
}

/**
 * Closes a chat and writes its summary. Used by "End session" and by the hourly job that
 * closes chats idle for 24 hours (most learners never press End).
 *
 * Practice itself (study time, streak, today's progress, skills) is already recorded per
 * message by metrics/practice.service.ts, so this only adds what needs the whole chat:
 * the session evaluation, the new words the AI found, and the day's skill snapshot.
 */
export async function finalizeSession(sessionId: string): Promise<void> {
  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      startedAt: true,
      endedAt: true,
      messages: {
        where: { role: "USER" },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          wordCount: true,
          evaluation: {
            select: {
              grammarScore: true,
              vocabularyScore: true,
              fluencyScore: true,
              overallScore: true,
              pronunciationScore: true,
              newWords: true,
              detectedCefrLevel: true,
              grammarErrors: true,
            },
          },
        },
      },
    },
  });
  if (!session || session.endedAt) return;
  const userId = session.userId;

  // Time actually spent chatting (start to last message), not how long the tab stayed open.
  const lastAt = session.messages.at(-1)?.createdAt ?? session.startedAt;
  const durationSeconds = Math.min(
    Math.max(0, Math.round((lastAt.getTime() - session.startedAt.getTime()) / 1000)),
    4 * 60 * 60,
  );
  const totalMessages = await prisma.message.count({ where: { sessionId } });

  // Only the call that actually closes the chat goes on (button and job can race).
  const closed = await prisma.conversationSession.updateMany({
    where: { id: sessionId, endedAt: null },
    data: { endedAt: new Date(), durationSeconds, messageCount: totalMessages },
  });
  if (!closed.count) return;

  const evaluatedMessages = session.messages.filter((m) => m.evaluation);
  const totalUserMessages = evaluatedMessages.length;
  const totalUserWords = session.messages.reduce((sum, m) => sum + (m.wordCount ?? 0), 0);

  if (totalUserMessages > 0) {
    const mean = (pick: (e: NonNullable<(typeof evaluatedMessages)[number]["evaluation"]>) => number) =>
      evaluatedMessages.reduce((s, m) => s + pick(m.evaluation!), 0) / totalUserMessages;
    const avgGrammar = mean((e) => e.grammarScore);
    const avgVocab = mean((e) => e.vocabularyScore);
    const avgFluency = mean((e) => e.fluencyScore);
    const avgOverall = mean((e) => e.overallScore);
    // The level is the AI's per-message CEFR judgement (most common one), not a score band —
    // a high score on two easy sentences is not C1. Too few messages → "" = not enough to tell.
    const cefrLevel = totalUserMessages >= MIN_MESSAGES_FOR_LEVEL
      ? mostCommonLevel(evaluatedMessages.map((m) => m.evaluation!.detectedCefrLevel)) ?? ""
      : "";

    // Grammar is never a strength in a chat where the tutor had to correct grammar.
    const grammarMistakes = evaluatedMessages.reduce((n, m) => {
      const errs = m.evaluation!.grammarErrors;
      return n + (Array.isArray(errs) ? errs.length : 0);
    }, 0);

    const scores = { grammar: avgGrammar, vocabulary: avgVocab, fluency: avgFluency };
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    for (const [skill, score] of Object.entries(scores)) {
      if (skill === "grammar" && grammarMistakes > 0) {
        if (score < 50 || grammarMistakes >= totalUserMessages) weaknesses.push("grammar needs improvement");
        continue;
      }
      if (score >= 75) strengths.push(`Strong ${skill} skills`);
      else if (score < 50) weaknesses.push(`${skill} needs improvement`);
    }

    const pronounced = evaluatedMessages.filter((m) => m.evaluation?.pronunciationScore != null);
    const avgPronunciation = pronounced.length
      ? pronounced.reduce((s, m) => s + (m.evaluation?.pronunciationScore ?? 0), 0) / pronounced.length
      : null;

    // New vocabulary the AI found in this chat goes to the learner's word list
    const rawVocab = evaluatedMessages.flatMap(
      (m) => ((m.evaluation?.newWords ?? []) as unknown as NewVocabularyWord[]),
    );
    const sessionVocabulary = await upsertSessionVocabulary(userId, rawVocab);

    await prisma.sessionEvaluation.create({
      data: {
        sessionId,
        topicsCovered: [],
        avgGrammarScore: Math.round(avgGrammar * 10) / 10,
        avgVocabularyScore: Math.round(avgVocab * 10) / 10,
        avgFluencyScore: Math.round(avgFluency * 10) / 10,
        avgOverallScore: Math.round(avgOverall * 10) / 10,
        avgPronunciationScore: avgPronunciation !== null ? Math.round(avgPronunciation * 10) / 10 : null,
        detectedCefrLevel: cefrLevel,
        strengths,
        weaknesses,
        recommendations: weaknesses.map((w) => `Focus on improving ${w.replace(" needs improvement", "")}`),
        newVocabulary: sessionVocabulary as unknown as object[],
        totalUserMessages,
        totalUserWords,
      },
    });

    // The day this chat happened (learner's calendar) keeps a snapshot of its skill level
    const day = learnerDay(await timezoneOf(userId), lastAt);
    await prisma.progress.updateMany({
      where: { userId, date: day },
      data: { skillSnapshot: { grammar: Math.round(avgGrammar), vocabulary: Math.round(avgVocab), fluency: Math.round(avgFluency) } },
    });
  }

  // Recent sessions and their scores show on the dashboard
  void deleteCache(cacheKeys.dashboard(userId));
}

// ── Session stats ─────────────────────────────────────────

export async function getSessionStats(
  targetUserId: string,
  days: number,
  actorUserId: string,
  actorRole: string,
): Promise<SessionStatsData> {
  // When viewing another user's stats, enforce class-membership (same pattern as metrics)
  if (targetUserId !== actorUserId) {
    if (actorRole === "TUTOR") {
      const sharedClass = await prisma.classUser.findFirst({
        where: {
          userId: actorUserId,
          role: "TUTOR",
          class: { users: { some: { userId: targetUserId } } },
        },
        select: { id: true },
      });
      if (!sharedClass) throw new AppError("Student not found or not in your class", 404);
    } else if (actorRole !== "ADMIN") {
      throw new AppError("Access denied", 403);
    }
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const sessions = await prisma.conversationSession.findMany({
    where: { userId: targetUserId, startedAt: { gte: startDate } },
    select: { startedAt: true, durationSeconds: true, endedAt: true },
    orderBy: { startedAt: "asc" },
  });

  // Build a zero-filled map for every day in the range
  const dayMap = new Map<string, { count: number; totalDuration: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dayMap.set(d.toISOString().split("T")[0]!, { count: 0, totalDuration: 0 });
  }

  for (const s of sessions) {
    const key = s.startedAt.toISOString().split("T")[0]!;
    const entry = dayMap.get(key);
    if (entry) {
      entry.count += 1;
      entry.totalDuration += s.durationSeconds ?? 0;
    }
  }

  const dailyStats = Array.from(dayMap.entries()).map(([date, { count, totalDuration }]) => ({
    date,
    sessionCount: count,
    totalDurationSeconds: totalDuration,
  }));

  const endedSessions = sessions.filter((s) => s.endedAt && s.durationSeconds != null);
  const averageDurationSeconds =
    endedSessions.length > 0
      ? Math.round(
          endedSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) /
            endedSessions.length,
        )
      : 0;

  return { days, totalSessions: sessions.length, averageDurationSeconds, dailyStats };
}

// ── Helpers ───────────────────────────────────────────────

/** Below this many scored messages a chat says nothing about the learner's CEFR level. */
const MIN_MESSAGES_FOR_LEVEL = 3;
