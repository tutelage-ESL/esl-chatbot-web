import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";

export interface TutorDashboardData {
  classes: {
    total: number
    active: number
  }
  students: {
    total: number
    activeToday: number
    activeThisWeek: number
  }
  skills: {
    avgGrammar: number
    avgVocabulary: number
    avgFluency: number
    avgSpeaking: number
  }
  sessionsToday: number
  recentActivity: Array<{
    userId: string
    displayName: string
    avatarUrl: string | null
    sessionMode: string
    startedAt: string
    avgOverallScore: number | null
    className: string
  }>
}

export async function getTutorDashboardStats(tutorId: string): Promise<TutorDashboardData> {
  // All class IDs where this user is a TUTOR member
  const tutorClasses = await prisma.classUser.findMany({
    where: { userId: tutorId, role: "TUTOR" },
    select: {
      classId: true,
      class: { select: { id: true, className: true, classStatus: true } },
    },
  });

  if (tutorClasses.length === 0) {
    return {
      classes: { total: 0, active: 0 },
      students: { total: 0, activeToday: 0, activeThisWeek: 0 },
      skills: { avgGrammar: 0, avgVocabulary: 0, avgFluency: 0, avgSpeaking: 0 },
      sessionsToday: 0,
      recentActivity: [],
    };
  }

  const classIds = tutorClasses.map((c) => c.classId);
  const classMap = new Map(tutorClasses.map((c) => [c.classId, c.class.className]));

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // All STUDENT members in tutor's classes
  const studentMembers = await prisma.classUser.findMany({
    where: { classId: { in: classIds }, role: "STUDENT", user: { isInternal: false } },
    select: { userId: true, classId: true },
  });

  const studentIds = [...new Set(studentMembers.map((s) => s.userId))];

  if (studentIds.length === 0) {
    return {
      classes: {
        total: tutorClasses.length,
        active: tutorClasses.filter((c) => c.class.classStatus === "ACTIVE").length,
      },
      students: { total: 0, activeToday: 0, activeThisWeek: 0 },
      skills: { avgGrammar: 0, avgVocabulary: 0, avgFluency: 0, avgSpeaking: 0 },
      sessionsToday: 0,
      recentActivity: [],
    };
  }

  const [
    dailySessions,
    weeklySessions,
    sessionsToday,
    metrics,
    recentSessions,
  ] = await Promise.all([
    prisma.conversationSession.findMany({
      where: { userId: { in: studentIds }, startedAt: { gte: todayStart } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.conversationSession.findMany({
      where: { userId: { in: studentIds }, startedAt: { gte: weekAgo } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.conversationSession.count({
      where: { userId: { in: studentIds }, startedAt: { gte: todayStart } },
    }),
    prisma.userMetrics.findMany({
      where: { userId: { in: studentIds } },
      select: { grammarSkill: true, vocabularySkill: true, fluencySkill: true, speakingSkill: true },
    }),
    prisma.conversationSession.findMany({
      where: { userId: { in: studentIds } },
      orderBy: { startedAt: "desc" },
      take: 8,
      select: {
        id: true,
        userId: true,
        mode: true,
        startedAt: true,
        user: { select: { displayName: true, avatarUrl: true } },
        evaluation: { select: { avgOverallScore: true } },
      },
    }),
  ]);

  // Average skill scores across all students with metrics
  const avgSkill = (key: keyof typeof metrics[0]) => {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + ((m[key] as number) ?? 0), 0);
    return Math.round(sum / metrics.length);
  };

  // Map each student to their first class (for display purposes)
  const studentClassMap = new Map<string, string>();
  for (const m of studentMembers) {
    if (!studentClassMap.has(m.userId)) {
      studentClassMap.set(m.userId, classMap.get(m.classId) ?? "Unknown class");
    }
  }

  const recentActivity = recentSessions.map((s) => ({
    userId: s.userId,
    displayName: s.user.displayName,
    avatarUrl: s.user.avatarUrl,
    sessionMode: s.mode,
    startedAt: s.startedAt.toISOString(),
    avgOverallScore: s.evaluation?.avgOverallScore ?? null,
    className: studentClassMap.get(s.userId) ?? "Unknown class",
  }));

  return {
    classes: {
      total: tutorClasses.length,
      active: tutorClasses.filter((c) => c.class.classStatus === "ACTIVE").length,
    },
    students: {
      total: studentIds.length,
      activeToday: dailySessions.length,
      activeThisWeek: weeklySessions.length,
    },
    skills: {
      avgGrammar: avgSkill("grammarSkill"),
      avgVocabulary: avgSkill("vocabularySkill"),
      avgFluency: avgSkill("fluencySkill"),
      avgSpeaking: avgSkill("speakingSkill"),
    },
    sessionsToday,
    recentActivity,
  };
}
