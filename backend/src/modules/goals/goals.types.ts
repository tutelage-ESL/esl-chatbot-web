import type { GoalStatus, GoalType } from "@prisma/client";

export interface GoalItem {
  id: string;
  userId: string;
  assignedByTutorId: string | null;
  type: GoalType;
  description: string;
  target: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT" | null;
  status: GoalStatus;
  progress: number;
  actionPlan: string | null;
  startDate: Date;
  targetDate: Date | null;
  completedDate: Date | null;
  lastProgressUpdate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedByTutor: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}
