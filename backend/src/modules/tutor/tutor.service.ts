import { prisma } from "../../config/database.ts";
import { lastPracticeFor, topMistakesFor } from "../classes/classes.progress.ts";
import type { StudentMistake } from "../classes/classes.types.ts";

// Tutor home dashboard, built around what needs the tutor next: work to review, deadlines
// coming up, students who stopped practising, and how each class is doing.
// Archived classes are left out. "Active" = sent the AI tutor a message in the last 7 days.

const DAY = 86_400_000;
const INACTIVE_DAYS = 7;

export interface TutorClassHealth {
  id: string;
  name: string;
  students: number;
  activeThisWeek: number;
  /** Handed in ÷ expected, over tasks whose deadline has passed; null = no past deadlines yet */
  handInRate: number | null;
  missing: number;
  toReview: number;
  /** Average of the four skills over students who practise; null = nobody yet */
  avgSkill: number | null;
}

export interface TutorDashboardData {
  totals: { classes: number; students: number; activeThisWeek: number; toReview: number; missing: number };
  needsYou: {
    toReview: { submissionId: string; taskId: string; classId: string; taskTitle: string; className: string; studentName: string; handedInAt: Date }[];
    dueSoon: { taskId: string; classId: string; title: string; className: string; deadline: Date; handedIn: number; students: number }[];
    inactive: { userId: string; classId: string; displayName: string; avatarUrl: string | null; className: string; lastPracticeAt: Date | null }[];
    inactiveCount: number;
  };
  classes: TutorClassHealth[];
  skills: { grammar: number; vocabulary: number; fluency: number; speaking: number; practisingStudents: number };
  commonMistakes: StudentMistake[];
}

const EMPTY: TutorDashboardData = {
  totals: { classes: 0, students: 0, activeThisWeek: 0, toReview: 0, missing: 0 },
  needsYou: { toReview: [], dueSoon: [], inactive: [], inactiveCount: 0 },
  classes: [],
  skills: { grammar: 0, vocabulary: 0, fluency: 0, speaking: 0, practisingStudents: 0 },
  commonMistakes: [],
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export async function getTutorDashboardStats(tutorId: string): Promise<TutorDashboardData> {
  const memberships = await prisma.classUser.findMany({
    where: { userId: tutorId, role: "TUTOR", class: { archived: false } },
    select: { class: { select: { id: true, className: true } } },
  });
  return statsForClasses(memberships.map((m) => m.class));
}

/** The tutor dashboard's numbers for any set of classes (a tutor's own, or every class for the admin dashboard). */
export async function statsForClasses(classes: { id: string; className: string }[]): Promise<TutorDashboardData> {
  if (!classes.length) return EMPTY;
  const classIds = classes.map((c) => c.id);
  const className = new Map(classes.map((c) => [c.id, c.className]));

  const roster = await prisma.classUser.findMany({
    where: { classId: { in: classIds }, role: "STUDENT", user: { isInternal: false } },
    select: { classId: true, user: { select: { id: true, displayName: true, avatarUrl: true } } },
  });
  const studentsOf = new Map<string, string[]>();
  for (const r of roster) studentsOf.set(r.classId, [...(studentsOf.get(r.classId) ?? []), r.user.id]);
  const studentIds = [...new Set(roster.map((r) => r.user.id))];
  if (!studentIds.length) return { ...EMPTY, totals: { ...EMPTY.totals, classes: classes.length }, classes: classes.map((c) => emptyClass(c.id, c.className)) };

  const now = new Date();
  const [lastPractice, metrics, tasks, mistakes] = await Promise.all([
    lastPracticeFor(studentIds),
    prisma.userMetrics.findMany({
      where: { userId: { in: studentIds } },
      select: { userId: true, grammarSkill: true, vocabularySkill: true, fluencySkill: true, speakingSkill: true },
    }),
    prisma.task.findMany({
      where: { classId: { in: classIds } },
      select: {
        id: true, classId: true, title: true, deadline: true, status: true,
        submissions: { select: { id: true, studentId: true, createdAt: true, feedback: true, student: { select: { displayName: true } } } },
      },
    }),
    topMistakesFor(studentIds),
  ]);

  const activeSince = now.getTime() - INACTIVE_DAYS * DAY;
  const isActive = (id: string) => (lastPractice.get(id)?.getTime() ?? 0) >= activeSince;

  // Skills: only students who have practised count (0 = no data, not a bad score)
  const practising = metrics.filter((m) => m.grammarSkill > 0);
  const speaking = metrics.filter((m) => m.speakingSkill > 0);
  const overall = new Map(practising.map((m) => {
    const xs = [m.grammarSkill, m.vocabularySkill, m.fluencySkill, m.speakingSkill].filter((x) => x > 0);
    return [m.userId, mean(xs)];
  }));

  // Per class
  const classHealth: TutorClassHealth[] = classes.map((c) => {
    const ids = studentsOf.get(c.id) ?? [];
    const own = tasks.filter((t) => t.classId === c.id);
    const past = own.filter((t) => t.deadline && t.deadline < now);
    const expected = past.length * ids.length;
    const handedInPast = past.reduce((n, t) => n + t.submissions.filter((s) => ids.includes(s.studentId)).length, 0);
    const skills = ids.map((id) => overall.get(id)).filter((x): x is number => x !== undefined);
    return {
      id: c.id,
      name: c.className,
      students: ids.length,
      activeThisWeek: ids.filter(isActive).length,
      handInRate: expected ? Math.round((handedInPast / expected) * 100) : null,
      missing: expected - handedInPast,
      toReview: own.reduce((n, t) => n + t.submissions.filter((s) => !s.feedback).length, 0),
      avgSkill: skills.length ? Math.round(mean(skills)) : null,
    };
  });

  const toReview = tasks
    .flatMap((t) => t.submissions.filter((s) => !s.feedback).map((s) => ({
      submissionId: s.id, taskId: t.id, classId: t.classId, taskTitle: t.title,
      className: className.get(t.classId) ?? "", studentName: s.student.displayName, handedInAt: s.createdAt,
    })))
    .sort((a, b) => a.handedInAt.getTime() - b.handedInAt.getTime()); // oldest waiting first

  const dueSoon = tasks
    .filter((t) => t.status === "OPEN" && t.deadline && t.deadline >= now && t.deadline.getTime() <= now.getTime() + 7 * DAY)
    .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime())
    .map((t) => ({
      taskId: t.id, classId: t.classId, title: t.title, className: className.get(t.classId) ?? "",
      deadline: t.deadline!, handedIn: t.submissions.length, students: (studentsOf.get(t.classId) ?? []).length,
    }));

  const seen = new Set<string>();
  const inactiveAll = roster
    .filter((r) => !isActive(r.user.id) && !seen.has(r.user.id) && seen.add(r.user.id))
    .map((r) => ({
      userId: r.user.id, classId: r.classId, displayName: r.user.displayName, avatarUrl: r.user.avatarUrl,
      className: className.get(r.classId) ?? "", lastPracticeAt: lastPractice.get(r.user.id) ?? null,
    }))
    // Never practised first, then the longest silent
    .sort((a, b) => (a.lastPracticeAt?.getTime() ?? 0) - (b.lastPracticeAt?.getTime() ?? 0));

  return {
    totals: {
      classes: classes.length,
      students: studentIds.length,
      activeThisWeek: studentIds.filter(isActive).length,
      toReview: toReview.length,
      missing: classHealth.reduce((n, c) => n + c.missing, 0),
    },
    needsYou: { toReview: toReview.slice(0, 6), dueSoon: dueSoon.slice(0, 5), inactive: inactiveAll.slice(0, 6), inactiveCount: inactiveAll.length },
    classes: classHealth,
    skills: {
      grammar: round1(mean(practising.map((m) => m.grammarSkill))),
      vocabulary: round1(mean(practising.map((m) => m.vocabularySkill))),
      fluency: round1(mean(practising.map((m) => m.fluencySkill))),
      speaking: round1(mean(speaking.map((m) => m.speakingSkill))),
      practisingStudents: practising.length,
    },
    commonMistakes: mistakes,
  };
}

function emptyClass(id: string, name: string): TutorClassHealth {
  return { id, name, students: 0, activeThisWeek: 0, handInRate: null, missing: 0, toReview: 0, avgSkill: null };
}
