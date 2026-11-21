import type { Plan } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { lastPracticeFor, topMistakesFor } from "../classes/classes.progress.ts";
import { statsForClasses } from "../tutor/tutor.service.ts";
import type { AdminClassRow, AdminLearning, AdminPeople, AdminTrendDay } from "./admin.types.ts";

// The admin dashboard's named and per-day parts (admin.dashboard.service.ts has the totals):
// who signed up, who practises, who stopped; every class; the last 30 days; how students are
// doing and how they use the AI. Internal (stealth) accounts never count. Days are UTC.

const DAY = 86_400_000;
const real = { isInternal: false } as const;
const nameOf = (u: { displayName: string | null; username: string }) => u.displayName || u.username;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

async function plansOf(userIds: string[]): Promise<Map<string, Plan>> {
  if (!userIds.length) return new Map();
  const rows = await prisma.subscription.findMany({ where: { userId: { in: userIds } }, select: { userId: true, plan: true } });
  return new Map(rows.map((r) => [r.userId, r.plan]));
}

export async function peopleSection(now: Date): Promise<AdminPeople> {
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const [newest, weekProgress, students] = await Promise.all([
    prisma.user.findMany({
      where: real,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true, displayName: true, username: true, role: true, emailVerified: true, createdAt: true,
        subscription: { select: { plan: true, status: true } },
      },
    }),
    prisma.progress.groupBy({
      by: ["userId"],
      where: { date: { gte: weekAgo }, user: { ...real, role: "STUDENT" } },
      _sum: { studyMinutes: true, messagesCount: true },
    }),
    prisma.user.findMany({ where: { ...real, role: "STUDENT", isActive: true }, select: { id: true, displayName: true, username: true } }),
  ]);

  const top = weekProgress
    .map((p) => ({ userId: p.userId, minutes: p._sum.studyMinutes ?? 0, messages: p._sum.messagesCount ?? 0 }))
    .filter((p) => p.minutes > 0 || p.messages > 0)
    .sort((a, b) => b.minutes - a.minutes || b.messages - a.messages)
    .slice(0, 5);

  const last = await lastPracticeFor(students.map((s) => s.id));
  const quietAll = students
    .filter((s) => { const at = last.get(s.id); return at && at < weekAgo; })
    .map((s) => ({ ...s, lastPracticeAt: last.get(s.id)! }))
    .sort((a, b) => b.lastPracticeAt.getTime() - a.lastPracticeAt.getTime()); // most recently quiet = easiest to win back
  const quiet = quietAll.slice(0, 6);

  const studentName = new Map(students.map((s) => [s.id, nameOf(s)]));
  const plans = await plansOf([...top.map((t) => t.userId), ...quiet.map((q) => q.id)]);

  return {
    newest: newest.map((u) => ({
      id: u.id, name: nameOf(u), username: u.username, role: u.role,
      verified: u.emailVerified || u.subscription?.status === "ACTIVE",
      plan: u.subscription?.plan ?? "FREE", joinedAt: u.createdAt,
    })),
    mostActive: top.map((t) => ({ id: t.userId, name: studentName.get(t.userId) ?? "Student", minutes: t.minutes, messages: t.messages, plan: plans.get(t.userId) ?? "FREE" })),
    goneQuiet: quiet.map((q) => ({ id: q.id, name: nameOf(q), lastPracticeAt: q.lastPracticeAt, plan: plans.get(q.id) ?? "FREE" })),
    goneQuietCount: quietAll.length,
  };
}

export async function classesSection(): Promise<AdminClassRow[]> {
  const classes = await prisma.class.findMany({
    where: { archived: false },
    select: {
      id: true, className: true,
      users: { where: { role: "TUTOR" }, take: 1, orderBy: { createdAt: "asc" }, select: { user: { select: { id: true, displayName: true, username: true } } } },
    },
  });
  const stats = await statsForClasses(classes);
  const teacher = new Map(classes.map((c) => [c.id, c.users[0]?.user ?? null]));
  return stats.classes
    .map((c) => { const t = teacher.get(c.id); return { ...c, teacher: t ? { id: t.id, name: nameOf(t) } : null }; })
    .sort((a, b) => b.students - a.students || a.name.localeCompare(b.name));
}

export async function trendSection(now: Date): Promise<AdminTrendDay[]> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
  const [messages, signUps] = await Promise.all([
    prisma.$queryRaw<{ day: Date; messages: number; learners: number }[]>`
      SELECT date_trunc('day', m."createdAt") AS day, count(*)::int AS messages, count(DISTINCT m."userId")::int AS learners
      FROM messages m JOIN users u ON u.id = m."userId"
      WHERE m.role = 'USER' AND m."createdAt" >= ${start} AND u."isInternal" = false
      GROUP BY 1`,
    prisma.$queryRaw<{ day: Date; n: number }[]>`
      SELECT date_trunc('day', "createdAt") AS day, count(*)::int AS n
      FROM users WHERE "createdAt" >= ${start} AND "isInternal" = false
      GROUP BY 1`,
  ]);
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const msg = new Map(messages.map((r) => [key(r.day), r]));
  const sign = new Map(signUps.map((r) => [key(r.day), r.n]));
  return Array.from({ length: 30 }, (_, i) => {
    const date = key(new Date(start.getTime() + i * DAY));
    return { date, signUps: sign.get(date) ?? 0, activeLearners: msg.get(date)?.learners ?? 0, messages: msg.get(date)?.messages ?? 0 };
  });
}

/** `weekUsage` = messages per user in the last 7 days (already counted for the totals). */
export async function learningSection(now: Date, weekUsage: { userId: string; count: number }[]): Promise<AdminLearning> {
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const [metrics, students, sessions] = await Promise.all([
    prisma.userMetrics.findMany({
      where: { user: { ...real, role: "STUDENT" } },
      select: { grammarSkill: true, vocabularySkill: true, fluencySkill: true, speakingSkill: true, estimatedLevel: true },
    }),
    prisma.user.findMany({ where: { ...real, role: "STUDENT" }, select: { id: true, displayName: true, username: true } }),
    prisma.conversationSession.groupBy({
      by: ["mode"],
      where: { startedAt: { gte: weekAgo }, user: real },
      _count: { _all: true },
      _sum: { durationSeconds: true },
    }),
  ]);

  // Skills: only students who have practised count (0 = no data, not a bad score)
  const practising = metrics.filter((m) => m.grammarSkill > 0);
  const speaking = metrics.filter((m) => m.speakingSkill > 0);

  const levels: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, NONE: 0 };
  const measured = new Map<string, number>();
  for (const m of metrics) if (m.estimatedLevel && m.estimatedLevel in levels) measured.set(m.estimatedLevel, (measured.get(m.estimatedLevel) ?? 0) + 1);
  for (const [lvl, n] of measured) levels[lvl] = n;
  levels.NONE = students.length - [...measured.values()].reduce((a, b) => a + b, 0);

  const mode = new Map(sessions.map((s) => [s.mode, s]));
  const studentName = new Map(students.map((s) => [s.id, nameOf(s)]));
  const heavy = weekUsage.filter((u) => studentName.has(u.userId)).sort((a, b) => b.count - a.count).slice(0, 5);
  const plans = await plansOf(heavy.map((h) => h.userId));

  return {
    skills: {
      grammar: round1(mean(practising.map((m) => m.grammarSkill))),
      vocabulary: round1(mean(practising.map((m) => m.vocabularySkill))),
      fluency: round1(mean(practising.map((m) => m.fluencySkill))),
      speaking: round1(mean(speaking.map((m) => m.speakingSkill))),
      practisingStudents: practising.length,
    },
    levels,
    commonMistakes: await topMistakesFor(students.map((s) => s.id)),
    modes: {
      chat: (mode.get("TEXT")?._count as { _all: number } | undefined)?._all ?? 0,
      voice: (mode.get("VOICE")?._count as { _all: number } | undefined)?._all ?? 0,
      voiceMinutes: Math.round((mode.get("VOICE")?._sum.durationSeconds ?? 0) / 60),
    },
    heavyUsers: heavy.map((h) => ({ id: h.userId, name: studentName.get(h.userId)!, messages: h.count, plan: plans.get(h.userId) ?? "FREE" })),
  };
}
