import { prisma } from "../../config/database.ts";
import { logger } from "../../config/index.ts";
import { deleteCache, cacheKeys } from "../../config/cache.ts";
import { createNotification } from "../notifications/notifications.service.ts";
import { learnerDay, sameDay, shiftDays, timezoneOf } from "../../utils/learnerDay.ts";
import { refreshStoredSkills } from "./skills.service.ts";

// Practice is recorded as it happens, after every message a learner sends to the AI tutor,
// instead of when they press "End session" (most never do). One place owns: today's
// progress row, study time, streak, last study day, and the skill scores.

/** A pause longer than this means they stepped away; the gap isn't study time. */
const ACTIVE_GAP_MIN = 5;
const minuteOf = (d: Date) => Math.floor(d.getTime() / 60_000);

export async function recordPractice(userId: string, sessionId: string, wordCount: number): Promise<void> {
  const tz = await timezoneOf(userId);
  const today = learnerDay(tz);

  // The message just saved, and the one before it in this chat
  const [latest, previous] = await prisma.message.findMany({
    where: { sessionId, role: "USER" },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { createdAt: true },
  });
  const firstInSession = !previous;
  // Active minutes: whole minutes since the previous message when they kept going,
  // 1 minute for a fresh start (first message, or back after a break).
  const gap = latest && previous ? minuteOf(latest.createdAt) - minuteOf(previous.createdAt) : null;
  const minutes = gap !== null && gap <= ACTIVE_GAP_MIN ? gap : 1;

  await prisma.progress.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, sessionsCount: 1, studyMinutes: minutes, messagesCount: 1, wordsTyped: wordCount },
    update: {
      ...(firstInSession && { sessionsCount: { increment: 1 } }),
      studyMinutes: { increment: minutes },
      messagesCount: { increment: 1 },
      wordsTyped: { increment: wordCount },
    },
  });

  const metrics = await prisma.userMetrics.findUnique({
    where: { userId },
    select: { currentStreak: true, longestStreak: true, lastStudyDate: true },
  });
  if (metrics) {
    // Same day: streak unchanged. Previous day: +1. Any older (or never): starts again at 1.
    const streak = sameDay(metrics.lastStudyDate, today)
      ? Math.max(1, metrics.currentStreak)
      : sameDay(metrics.lastStudyDate, shiftDays(today, -1))
        ? metrics.currentStreak + 1
        : 1;
    await prisma.userMetrics.update({
      where: { userId },
      data: {
        totalStudyTimeMinutes: { increment: minutes },
        totalWordsTyped: { increment: wordCount },
        currentStreak: streak,
        longestStreak: Math.max(metrics.longestStreak, streak),
        lastStudyDate: today,
      },
    });
    for (const milestone of [7, 30, 100]) {
      if (metrics.currentStreak < milestone && streak >= milestone) {
        await createNotification(userId, "STREAK_MILESTONE", `Amazing! You've reached a ${milestone}-day study streak!`).catch(() => {});
      }
    }
  }

  await refreshStoredSkills(userId);
  await deleteCache(cacheKeys.dashboard(userId));
}

/** After a scored message: never let metrics bookkeeping fail the learner's reply. */
export function recordPracticeInBackground(userId: string, sessionId: string, wordCount: number): void {
  void recordPractice(userId, sessionId, wordCount).catch((err) =>
    logger.warn("[practice] record failed", { userId, sessionId, error: err?.message }),
  );
}
