import { prisma } from "../../config/database.ts";
import type { ProgressEntry, ProgressSummaryDay } from "./progress.types.ts";

const PROGRESS_SELECT = {
  id: true,
  userId: true,
  date: true,
  sessionsCount: true,
  studyMinutes: true,
  messagesCount: true,
  wordsTyped: true,
  vocabularyPracticed: true,
  goalsAdvanced: true,
  pronunciationScore: true,
  skillSnapshot: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listProgress(
  userId: string,
  page: number,
  limit: number,
  startDate?: string,
  endDate?: string,
): Promise<{ entries: ProgressEntry[]; total: number }> {
  const where: { userId: string; date?: { gte?: Date; lte?: Date } } = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const [entries, total] = await prisma.$transaction([
    prisma.progress.findMany({
      where,
      select: PROGRESS_SELECT,
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.progress.count({ where }),
  ]);

  return { entries, total };
}

export async function getTodayProgress(userId: string): Promise<ProgressEntry> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entry = await prisma.progress.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today },
    update: {},
    select: PROGRESS_SELECT,
  });

  return entry;
}

export async function getProgressSummary(
  userId: string,
  days: number,
): Promise<ProgressSummaryDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const entries = await prisma.progress.findMany({
    where: { userId, date: { gte: since } },
    select: {
      date: true,
      sessionsCount: true,
      studyMinutes: true,
      messagesCount: true,
      wordsTyped: true,
      vocabularyPracticed: true,
    },
    orderBy: { date: "asc" },
  });

  return entries.map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    sessionsCount: e.sessionsCount,
    studyMinutes: e.studyMinutes,
    messagesCount: e.messagesCount,
    wordsTyped: e.wordsTyped,
    vocabularyPracticed: e.vocabularyPracticed,
  }));
}
