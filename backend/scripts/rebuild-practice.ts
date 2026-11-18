// One-off backfill: rebuild every learner's practice history from their messages, with the
// same rules practice.service.ts now applies per message (active minutes, the learner's own
// calendar days, streaks). Before, practice was only recorded on "End session", which most
// learners never pressed, so study time, the activity calendar and streaks were mostly empty.
//
// Rewrites only the counting fields of Progress (studyMinutes, messagesCount, wordsTyped,
// sessionsCount) and UserMetrics (totals, last study day, streaks). Safe to re-run.
//
//   bun scripts/rebuild-practice.ts            (uses DATABASE_URL)
import { prisma } from "../src/config/database.ts";
import { learnerDay, safeTimezone, shiftDays } from "../src/utils/learnerDay.ts";

const ACTIVE_GAP_MIN = 5;
const minuteOf = (d: Date) => Math.floor(d.getTime() / 60_000);
const key = (d: Date) => d.toISOString().slice(0, 10);

const learners = await prisma.user.findMany({
  where: { messages: { some: { role: "USER" } } },
  select: { id: true, learnerProfile: { select: { timezone: true } }, metrics: { select: { longestStreak: true } } },
});

for (const learner of learners) {
  const tz = safeTimezone(learner.learnerProfile?.timezone);
  const messages = await prisma.message.findMany({
    where: { userId: learner.id, role: "USER" },
    orderBy: [{ sessionId: "asc" }, { createdAt: "asc" }],
    select: { sessionId: true, createdAt: true, wordCount: true },
  });

  const days = new Map<string, { date: Date; minutes: number; messages: number; words: number; sessions: Set<string> }>();
  let prev: { sessionId: string; at: Date } | null = null;
  for (const m of messages) {
    const sameChat = prev?.sessionId === m.sessionId;
    const gap = sameChat ? minuteOf(m.createdAt) - minuteOf(prev!.at) : null;
    const minutes = gap !== null && gap <= ACTIVE_GAP_MIN ? gap : 1;
    const date = learnerDay(tz, m.createdAt);
    const d = days.get(key(date)) ?? { date, minutes: 0, messages: 0, words: 0, sessions: new Set<string>() };
    d.minutes += minutes;
    d.messages += 1;
    d.words += m.wordCount ?? 0;
    d.sessions.add(m.sessionId);
    days.set(key(date), d);
    prev = { sessionId: m.sessionId, at: m.createdAt };
  }

  // Days with progress rows but no messages keep their other fields, with no study counted
  await prisma.progress.updateMany({
    where: { userId: learner.id, date: { notIn: [...days.values()].map((d) => d.date) } },
    data: { studyMinutes: 0, messagesCount: 0, wordsTyped: 0, sessionsCount: 0 },
  });
  for (const d of days.values()) {
    const counts = { studyMinutes: d.minutes, messagesCount: d.messages, wordsTyped: d.words, sessionsCount: d.sessions.size };
    await prisma.progress.upsert({
      where: { userId_date: { userId: learner.id, date: d.date } },
      create: { userId: learner.id, date: d.date, ...counts },
      update: counts,
    });
  }

  // Streaks from the calendar of practised days
  const sorted = [...days.values()].map((d) => d.date).sort((a, b) => a.getTime() - b.getTime());
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i - 1]!.getTime() === shiftDays(sorted[i]!, -1).getTime() ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const last = sorted.at(-1) ?? null;
  const today = learnerDay(tz);
  const alive = last && last.getTime() >= shiftDays(today, -1).getTime();

  await prisma.userMetrics.updateMany({
    where: { userId: learner.id },
    data: {
      totalStudyTimeMinutes: [...days.values()].reduce((s, d) => s + d.minutes, 0),
      totalWordsTyped: [...days.values()].reduce((s, d) => s + d.words, 0),
      lastStudyDate: last,
      currentStreak: alive ? run : 0,
      longestStreak: Math.max(longest, learner.metrics?.longestStreak ?? 0),
    },
  });
}

console.log(`Rebuilt practice history for ${learners.length} learners.`);
await prisma.$disconnect();
