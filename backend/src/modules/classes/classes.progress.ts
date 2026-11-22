import { prisma } from "../../config/database.ts";
import type { StudentMistake, StudentTaskItem, TaskRecord } from "./classes.types.ts";

// Progress a tutor can act on: how each student is doing with this class's tasks, when
// they last practised, and the mistakes they keep making. Used by the class People list
// and the student detail page.

type RawTask = {
  id: string;
  title: string;
  deadline: Date | null;
  status: "OPEN" | "CLOSED";
  createdAt: Date;
  submissions: { studentId: string; createdAt: Date; feedback: string | null }[];
};

function loadClassTasks(classId: string, studentIds: string[]): Promise<RawTask[]> {
  return prisma.task.findMany({
    where: { classId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      deadline: true,
      status: true,
      createdAt: true,
      submissions: {
        where: { studentId: { in: studentIds } },
        select: { studentId: true, createdAt: true, feedback: true },
      },
    },
  });
}

/** One student's line for one task. Missing = past the deadline and not handed in. */
function taskItem(t: RawTask, studentId: string, now: Date): StudentTaskItem {
  const sub = t.submissions.find((s) => s.studentId === studentId) ?? null;
  const pastDue = !!t.deadline && t.deadline < now;
  const state: StudentTaskItem["state"] = sub
    ? sub.feedback ? "REVIEWED" : t.deadline && sub.createdAt > t.deadline ? "LATE" : "HANDED_IN"
    : pastDue ? "MISSING" : t.status === "CLOSED" ? "CLOSED" : "ASSIGNED";
  return {
    id: t.id,
    title: t.title,
    deadline: t.deadline,
    taskStatus: t.status,
    state,
    handedInAt: sub?.createdAt ?? null,
  };
}

function summarize(items: StudentTaskItem[]): TaskRecord {
  const count = (...states: StudentTaskItem["state"][]) => items.filter((i) => states.includes(i.state)).length;
  return {
    total: items.length,
    handedIn: count("HANDED_IN", "LATE", "REVIEWED"),
    late: count("LATE"),
    missing: count("MISSING"),
    reviewed: count("REVIEWED"),
  };
}

export async function taskRecordsFor(classId: string, studentIds: string[]): Promise<Map<string, TaskRecord>> {
  const tasks = await loadClassTasks(classId, studentIds);
  const now = new Date();
  return new Map(studentIds.map((id) => [id, summarize(tasks.map((t) => taskItem(t, id, now)))]));
}

export async function tasksForStudent(classId: string, studentId: string) {
  const tasks = await loadClassTasks(classId, [studentId]);
  const now = new Date();
  const items = tasks.map((t) => taskItem(t, studentId, now));
  return { items, summary: summarize(items) };
}

/** When each student last sent a message to the AI tutor (typed or spoken). */
export async function lastPracticeFor(studentIds: string[]): Promise<Map<string, Date>> {
  if (!studentIds.length) return new Map();
  const rows = await prisma.message.groupBy({
    by: ["userId"],
    where: { userId: { in: studentIds }, role: "USER" },
    _max: { createdAt: true },
  });
  return new Map(rows.filter((r) => r._max.createdAt).map((r) => [r.userId, r._max.createdAt!]));
}

/** Most frequent grammar mistakes in the last 30 days (one student or a whole group), with one real example each. */
export async function topMistakesFor(userIds: string | string[], limit = 5): Promise<StudentMistake[]> {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (!ids.length) return [];
  const since = new Date(Date.now() - 30 * 86_400_000);
  const evals = await prisma.messageEvaluation.findMany({
    where: { message: { userId: { in: ids } }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { grammarErrors: true, corrections: true },
  });
  const tally = new Map<string, StudentMistake>();
  for (const ev of evals) {
    const errors = ev.grammarErrors as Array<{ error?: string; correction?: string; rule?: string }>;
    if (!Array.isArray(errors)) continue;
    // grammarErrors[].error is the AI's *description* ("Incorrect verb tense"); the
    // student's own words only live in corrections[].original.
    const fixes = (Array.isArray(ev.corrections) ? ev.corrections : []) as Array<{ original?: string; corrected?: string }>;
    errors.forEach((e, i) => {
      const rule = (e.rule ?? e.error ?? "").trim();
      if (!rule) return;
      const fix = fixes.find((f) => f.corrected && f.corrected === e.correction) ?? fixes[i];
      const example = fix?.original && fix.corrected ? { said: fix.original, better: fix.corrected } : null;
      const key = rule.toLowerCase(); // the AI writes the same rule in different cases
      const hit = tally.get(key);
      if (hit) {
        hit.count++;
        hit.example ??= example;
      } else tally.set(key, { rule, count: 1, example });
    });
  }
  return [...tally.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** A student's unfinished class work across all their (non-archived) classes, soonest first. */
export async function openTasksForStudent(userId: string, limit = 6) {
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: {
      class: { archived: false, users: { some: { userId, role: "STUDENT" } } },
      submissions: { none: { studentId: userId } },
      // Still open, or closed after its deadline passed (= missed)
      OR: [{ status: "OPEN" }, { deadline: { lt: now } }],
    },
    orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: limit,
    select: { id: true, classId: true, title: true, deadline: true, class: { select: { className: true } } },
  });
  return tasks.map((t) => ({
    id: t.id,
    classId: t.classId,
    className: t.class.className,
    title: t.title,
    deadline: t.deadline,
    state: (t.deadline && t.deadline < now ? "MISSING" : "ASSIGNED") as "MISSING" | "ASSIGNED",
  }));
}

/** Chats that had at least one message, all time. */
export function chatCountFor(userId: string): Promise<number> {
  return prisma.conversationSession.count({ where: { userId, messageCount: { gt: 0 } } });
}
