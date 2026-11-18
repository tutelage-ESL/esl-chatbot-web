import { prisma } from "../../config/database.ts";
import { getCache, setCache, cacheKeys, cacheTTL } from "../../config/cache.ts";
import { learnerDay, sameDay, shiftDays, timezoneOf, weekStart } from "../../utils/learnerDay.ts";
import { computeSkills } from "../metrics/skills.service.ts";
import { openTasksForStudent } from "../classes/classes.progress.ts";
import type {
  DashboardOverviewData,
  DashboardVocabGrowth,
  LearnerActivity,
  LearnerVocab,
  LearnerWeek,
  VocabGrowthRange,
} from "./dashboard.types.ts";

// Learner home dashboard: what to do today, how this week is going, where they stand.
// Days are the learner's own calendar days (see utils/learnerDay.ts).

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

async function buildWeekAndActivity(userId: string, today: Date, weeklyGoal: number): Promise<{ week: LearnerWeek; activity: LearnerActivity }> {
  const thisWeek = weekStart(today);
  const first = shiftDays(thisWeek, -7 * 11);
  const rows = await prisma.progress.findMany({
    where: { userId, date: { gte: first } },
    select: { date: true, studyMinutes: true },
  });
  const minutes = new Map(rows.map((r) => [dayKey(r.date), r.studyMinutes]));
  const cell = (day: Date) => (day.getTime() > today.getTime() ? null : minutes.get(dayKey(day)) ?? 0);

  const weeks = Array.from({ length: 12 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => cell(shiftDays(first, w * 7 + d))));
  const days = Array.from({ length: 7 }, (_, d) => {
    const day = shiftDays(thisWeek, d);
    return { date: dayKey(day), minutes: cell(day) };
  });
  return {
    week: { days, minutes: days.reduce((s, d) => s + (d.minutes ?? 0), 0), weeklyGoalMinutes: weeklyGoal },
    activity: { weeks, firstDay: dayKey(first), activeDays: weeks.flat().filter((m) => (m ?? 0) > 0).length },
  };
}

async function buildVocab(userId: string): Promise<LearnerVocab> {
  const now = new Date();
  const [total, due, mastered, addedThisWeek, dueWords] = await Promise.all([
    prisma.vocabulary.count({ where: { userId } }),
    prisma.vocabulary.count({ where: { userId, srsDue: { lte: now } } }),
    prisma.vocabulary.count({ where: { userId, masteryLevel: 5 } }),
    prisma.vocabulary.count({ where: { userId, createdAt: { gte: shiftDays(now, -7) } } }),
    prisma.vocabulary.findMany({
      where: { userId, srsDue: { lte: now } },
      orderBy: { srsDue: "asc" },
      take: 4,
      select: { word: true, definition: true },
    }),
  ]);
  return { total, due, mastered, addedThisWeek, dueWords };
}

async function buildOverview(userId: string): Promise<DashboardOverviewData> {
  const tz = await timezoneOf(userId);
  const today = learnerDay(tz);

  const [profile, metrics, todayRow, skills, vocab, tasks, goals, chats] = await Promise.all([
    prisma.learnerProfile.findUnique({ where: { userId }, select: { weeklyGoalMinutes: true, currentLevel: true, targetLevel: true } }),
    prisma.userMetrics.findUnique({ where: { userId }, select: { currentStreak: true, longestStreak: true, lastStudyDate: true } }),
    prisma.progress.findUnique({ where: { userId_date: { userId, date: today } }, select: { studyMinutes: true } }),
    computeSkills(userId),
    buildVocab(userId),
    openTasksForStudent(userId),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: 3,
      select: { id: true, type: true, description: true, target: true, progress: true, targetDate: true },
    }),
    prisma.conversationSession.findMany({
      where: { userId, deletedAt: null, messageCount: { gt: 0 } },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true, title: true, topic: true, mode: true, startedAt: true, messageCount: true,
        evaluation: { select: { avgOverallScore: true } },
      },
    }),
  ]);

  const weeklyGoal = profile?.weeklyGoalMinutes || 60;
  const { week, activity } = await buildWeekAndActivity(userId, today, weeklyGoal);

  // A streak is only alive if they studied today or yesterday (the reset job runs hourly)
  const alive = sameDay(metrics?.lastStudyDate, today) || sameDay(metrics?.lastStudyDate, shiftDays(today, -1));

  return {
    today: {
      date: dayKey(today),
      minutes: todayRow?.studyMinutes ?? 0,
      dailyGoalMinutes: Math.max(1, Math.round(weeklyGoal / 7)),
      streak: alive ? metrics?.currentStreak ?? 0 : 0,
      longestStreak: metrics?.longestStreak ?? 0,
    },
    week,
    skills: { ...skills, selfLevel: profile?.currentLevel ?? null, targetLevel: profile?.targetLevel ?? null },
    vocab,
    tasks,
    goals: goals.map((g) => ({ ...g, type: g.type as string })),
    activity,
    recentChats: chats.map((c) => ({
      id: c.id,
      title: c.title,
      topic: c.topic,
      mode: c.mode,
      startedAt: c.startedAt,
      messageCount: c.messageCount,
      score: c.evaluation ? Math.round(c.evaluation.avgOverallScore) : null,
    })),
  };
}

export async function getDashboardOverview(userId: string): Promise<DashboardOverviewData> {
  const cached = await getCache<DashboardOverviewData>(cacheKeys.dashboard(userId));
  if (cached) return cached;
  const result = await buildOverview(userId);
  await setCache(cacheKeys.dashboard(userId), result, cacheTTL.dashboard);
  return result;
}

// ── Vocabulary growth by range ────────────────────────────────────────────────

export async function getVocabGrowth(
  userId: string,
  range: VocabGrowthRange,
): Promise<DashboardVocabGrowth> {
  const now = new Date();

  // Determine bucket count and bucket size based on range
  // 7d  → 7 daily buckets
  // 30d → 30 daily buckets
  // all → monthly buckets for up to 12 months
  let buckets: { label: string; start: Date; end: Date }[] = [];

  if (range === "7d") {
    // 7 daily buckets — labelled by weekday name (Mon, Tue, …)
    for (let d = 6; d >= 0; d--) {
      const start = new Date(now);
      start.setDate(start.getDate() - d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const label = start.toLocaleDateString("en-US", { weekday: "short" });
      buckets.push({ label, start, end });
    }
  } else if (range === "30d") {
    // 30 daily buckets — labelled by weekday name (Mon, Tue, …)
    for (let d = 29; d >= 0; d--) {
      const start = new Date(now);
      start.setDate(start.getDate() - d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      const label = start.toLocaleDateString("en-US", { weekday: "short" });
      buckets.push({ label, start, end });
    }
  } else {
    // "all" → 12 monthly buckets going back 11 months — labelled by month name only
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      const label = start.toLocaleDateString("en-US", { month: "short" });
      buckets.push({ label, start, end });
    }
  }

  const windowStart = buckets[0]!.start;

  const [allVocabInWindow, totalWords, countBeforeWindow] = await Promise.all([
    prisma.vocabulary.findMany({
      where: { userId, createdAt: { gte: windowStart } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.vocabulary.count({ where: { userId } }),
    prisma.vocabulary.count({ where: { userId, createdAt: { lt: windowStart } } }),
  ]);

  let running = countBeforeWindow;
  const points = buckets.map((b) => {
    const count = allVocabInWindow.filter(
      (v) => v.createdAt >= b.start && v.createdAt < b.end,
    ).length;
    running += count;
    return { label: b.label, value: running };
  });

  // Growth % = words added in window vs total before window
  const addedInWindow = totalWords - countBeforeWindow;
  // Growth from zero words is not a percentage: null, and the UI says "new"
  const growthPct =
    countBeforeWindow === 0
      ? null
      : Math.round((addedInWindow / countBeforeWindow) * 100 * 10) / 10;

  return { points, totalWords, growthPct, range };
}
