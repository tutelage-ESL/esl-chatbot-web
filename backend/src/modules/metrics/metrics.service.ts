import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import type { MetricsData } from "./metrics.types.ts";

const METRICS_SELECT = {
  id: true,
  userId: true,
  totalStudyTimeMinutes: true,
  totalWordsTyped: true,
  currentStreak: true,
  longestStreak: true,
  lastStudyDate: true,
  estimatedLevel: true,
  grammarSkill: true,
  vocabularySkill: true,
  fluencySkill: true,
  speakingSkill: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getMyMetrics(userId: string): Promise<MetricsData> {
  const metrics = await prisma.userMetrics.findUnique({
    where: { userId },
    select: METRICS_SELECT,
  });
  if (!metrics) throw new AppError("Metrics not found", 404);
  return metrics;
}

export async function getStudentMetrics(
  studentId: string,
  actorUserId: string,
  actorRole: string,
): Promise<MetricsData> {
  if (actorRole !== "ADMIN") {
    // Tutor must share a class with the target student
    const sharedClass = await prisma.classUser.findFirst({
      where: {
        userId: actorUserId,
        role: "TUTOR",
        class: {
          users: { some: { userId: studentId } },
        },
      },
      select: { id: true },
    });
    if (!sharedClass) {
      throw new AppError("Student not found or not in your class", 404);
    }
  }

  const metrics = await prisma.userMetrics.findUnique({
    where: { userId: studentId },
    select: METRICS_SELECT,
  });
  if (!metrics) throw new AppError("Metrics not found for this student", 404);
  return metrics;
}
