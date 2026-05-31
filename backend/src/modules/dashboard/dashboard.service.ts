import { prisma } from "../../config/database.ts";
import type {
  DashboardOverviewData,
  DashboardGreetingHero,
  DashboardStatCards,
  DashboardVocabChart,
  DashboardNextUp,
  DashboardActivityHeatmap,
  DashboardDueWords,
} from "./dashboard.types.ts";

// ── CEFR helpers ──────────────────────────────────────────────────────────────

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function cefrToPct(level: string | null): number {
  if (!level) return 0;
  const idx = CEFR_ORDER.indexOf(level.toUpperCase() as (typeof CEFR_ORDER)[number]);
  if (idx === -1) return 0;
  // 0–100 across the 6 bands: A1=0, A2=20, B1=40, B2=60, C1=80, C2=100
  return Math.round((idx / (CEFR_ORDER.length - 1)) * 100);
}

// ── Section builders (each is one focused async fn) ──────────────────────────

async function buildGreetingHero(userId: string): Promise<DashboardGreetingHero> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [metrics, todayProgress, learnerProfile, dueVocabCount] = await Promise.all([
    prisma.userMetrics.findUnique({
      where: { userId },
      select: { currentStreak: true },
    }),
    prisma.progress.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { studyMinutes: true },
    }),
    prisma.learnerProfile.findUnique({
      where: { userId },
      select: { weeklyGoalMinutes: true },
    }),
    prisma.vocabulary.count({
      where: { userId, srsDue: { lte: new Date() } },
    }),
  ]);

  const weeklyGoal = learnerProfile?.weeklyGoalMinutes ?? 60;
  const dailyGoalMins = Math.max(1, Math.round(weeklyGoal / 7));

  return {
    streak: metrics?.currentStreak ?? 0,
    doneMins: todayProgress?.studyMinutes ?? 0,
    goalMins: dailyGoalMins,
    dueVocabCount,
  };
}

async function buildStatCards(userId: string): Promise<DashboardStatCards> {
  const now = new Date();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    metrics,
    learnerProfile,
    wordsMastered,
    wordsMasteredDelta,
    practiceThisMonth,
    lastTwoSessionEvals,
  ] = await Promise.all([
    prisma.userMetrics.findUnique({
      where: { userId },
      select: {
        totalStudyTimeMinutes: true,
        speakingSkill: true,
        estimatedLevel: true,
      },
    }),
    // Fallback level source: user-set currentLevel in learner profile
    prisma.learnerProfile.findUnique({
      where: { userId },
      select: { currentLevel: true },
    }),
    prisma.vocabulary.count({
      where: { userId, masteryLevel: 5 },
    }),
    prisma.vocabulary.count({
      where: { userId, masteryLevel: 5, updatedAt: { gte: sevenDaysAgo } },
    }),
    prisma.progress.aggregate({
      where: { userId, date: { gte: monthStart } },
      _sum: { studyMinutes: true },
    }),
    // Last 2 ended sessions with a pronunciation score to compute delta
    prisma.sessionEvaluation.findMany({
      where: {
        session: { userId, endedAt: { not: null } },
        avgPronunciationScore: { not: null },
      },
      select: { avgPronunciationScore: true },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  ]);

  let pronunciationDelta: number | null = null;
  const [latest, previous] = lastTwoSessionEvals;
  if (
    latest?.avgPronunciationScore != null &&
    previous?.avgPronunciationScore != null
  ) {
    pronunciationDelta = Math.round(latest.avgPronunciationScore - previous.avgPronunciationScore);
  }

  // estimatedLevel (AI-detected) takes priority; fall back to user-set currentLevel
  const level = metrics?.estimatedLevel ?? learnerProfile?.currentLevel ?? null;

  return {
    wordsMastered,
    wordsMasteredWeekDelta: wordsMasteredDelta,
    practiceTimeMinutes: metrics?.totalStudyTimeMinutes ?? 0,
    practiceTimeThisMonthMinutes: practiceThisMonth._sum.studyMinutes ?? 0,
    pronunciationScore: Math.round(metrics?.speakingSkill ?? 0),
    pronunciationDelta,
    currentLevel: level,
    levelPct: cefrToPct(level),
  };
}

async function buildVocabChart(userId: string): Promise<DashboardVocabChart> {
  const now = new Date();

  // 6-week window: pull all vocab created in the last 42 days
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 41);
  windowStart.setHours(0, 0, 0, 0);

  // 30-day-ago snapshot for growth %
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [allVocab, totalWords, countThirtyDaysAgo] = await Promise.all([
    prisma.vocabulary.findMany({
      where: { userId, createdAt: { gte: windowStart } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.vocabulary.count({ where: { userId } }),
    prisma.vocabulary.count({ where: { userId, createdAt: { lt: thirtyDaysAgo } } }),
  ]);

  // Build 6 weekly buckets: each label is the Monday of that week
  const buckets: { label: string; count: number }[] = [];
  for (let w = 5; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - w * 7 - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const count = allVocab.filter(
      (v) => v.createdAt >= weekStart && v.createdAt < weekEnd,
    ).length;
    buckets.push({ label, count });
  }

  // Convert per-week counts to cumulative totals anchored at `totalWords`
  const baseBeforeWindow = totalWords - buckets.reduce((s, b) => s + b.count, 0);
  let running = baseBeforeWindow;
  const points = buckets.map((b) => {
    running += b.count;
    return { label: b.label, value: running };
  });

  const growthPct =
    countThirtyDaysAgo === 0
      ? 0
      : Math.round(((totalWords - countThirtyDaysAgo) / countThirtyDaysAgo) * 100 * 10) / 10;

  return { points, totalWords, growthPct };
}

async function buildNextUp(userId: string): Promise<DashboardNextUp> {
  const activeGoals = await prisma.goal.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      id: true,
      type: true,
      description: true,
      target: true,
      progress: true,
      difficulty: true,
      targetDate: true,
    },
    orderBy: [
      { targetDate: "asc" },
      { createdAt: "asc" },
    ],
    take: 4,
  });

  const mapped = activeGoals.map((g) => ({
    id: g.id,
    type: g.type as string,
    description: g.description,
    target: g.target,
    progress: g.progress,
    difficulty: g.difficulty as string | null,
    targetDate: g.targetDate ? g.targetDate.toISOString() : null,
  }));

  return {
    primary: mapped[0] ?? null,
    others: mapped.slice(1),
  };
}

async function buildActivityHeatmap(userId: string): Promise<DashboardActivityHeatmap> {
  const now = new Date();
  const eightyfourDaysAgo = new Date(now);
  eightyfourDaysAgo.setUTCDate(eightyfourDaysAgo.getUTCDate() - 83);
  eightyfourDaysAgo.setUTCHours(0, 0, 0, 0);

  const [progressRows, recentSessionRows] = await Promise.all([
    prisma.progress.findMany({
      where: { userId, date: { gte: eightyfourDaysAgo } },
      select: { date: true, sessionsCount: true },
      orderBy: { date: "asc" },
    }),
    prisma.conversationSession.findMany({
      where: { userId },
      select: {
        id: true,
        mode: true,
        topic: true,
        startedAt: true,
        durationSeconds: true,
        messageCount: true,
        evaluation: {
          select: {
            avgOverallScore: true,
            avgPronunciationScore: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  // toUTCDateKey: @db.Date is stored as UTC midnight — always use UTC parts to build the key
  function toUTCDateKey(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Build a date→sessions map
  const dateMap = new Map<string, number>();
  for (const row of progressRows) {
    dateMap.set(toUTCDateKey(row.date), row.sessionsCount);
  }

  // Build 12 weeks × 7 days grid starting from 83 days ago
  const weeks: number[][] = [];
  let activeDays = 0;

  for (let w = 0; w < 12; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(eightyfourDaysAgo);
      day.setUTCDate(eightyfourDaysAgo.getUTCDate() + w * 7 + d);
      const key = toUTCDateKey(day);
      const sessions = dateMap.get(key) ?? 0;
      // Clamp to 7 for the colour scale used by the frontend
      week.push(Math.min(7, sessions));
      if (sessions > 0) activeDays++;
    }
    weeks.push(week);
  }

  const activePct = Math.round((activeDays / 84) * 100);

  const recentSessions = recentSessionRows.map((s) => ({
    id: s.id,
    mode: s.mode as "TEXT" | "VOICE",
    topic: s.topic,
    startedAt: s.startedAt.toISOString(),
    durationSeconds: s.durationSeconds,
    messageCount: s.messageCount,
    avgOverallScore: s.evaluation
      ? Math.round(s.evaluation.avgOverallScore)
      : null,
    avgPronunciationScore: s.evaluation?.avgPronunciationScore
      ? Math.round(s.evaluation.avgPronunciationScore)
      : null,
  }));

  return { weeks, activePct, recentSessions };
}

async function buildDueWords(userId: string): Promise<DashboardDueWords> {
  const now = new Date();

  const [words, totalDue, metrics] = await Promise.all([
    prisma.vocabulary.findMany({
      where: { userId, srsDue: { lte: now } },
      select: { word: true, definition: true, srsDue: true },
      orderBy: { srsDue: "asc" },
      take: 4,
    }),
    prisma.vocabulary.count({
      where: { userId, srsDue: { lte: now } },
    }),
    prisma.userMetrics.findUnique({
      where: { userId },
      select: { estimatedLevel: true },
    }),
  ]);

  return {
    words: words.map((w) => ({
      word: w.word,
      definition: w.definition,
      srsDue: w.srsDue.toISOString(),
    })),
    totalDue,
    levelPct: cefrToPct(metrics?.estimatedLevel ?? null),
  };
}

// ── Main export: all sections in parallel ─────────────────────────────────────

export async function getDashboardOverview(userId: string): Promise<DashboardOverviewData> {
  const [greetingHero, statCards, vocabChart, nextUp, activityHeatmap, dueWords] =
    await Promise.all([
      buildGreetingHero(userId),
      buildStatCards(userId),
      buildVocabChart(userId),
      buildNextUp(userId),
      buildActivityHeatmap(userId),
      buildDueWords(userId),
    ]);

  return { greetingHero, statCards, vocabChart, nextUp, activityHeatmap, dueWords };
}
