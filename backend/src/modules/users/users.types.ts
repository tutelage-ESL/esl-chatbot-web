import type { Role, Plan, SubStatus, ClassStatus } from "@prisma/client";

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  role: Role;
  phoneNumber: string | null;
  createdAt: Date;
}

export interface UserDetail extends UserListItem {
  updatedAt: Date;
  learnerProfile: {
    id: string;
    currentLevel: string | null;
    targetLevel: string | null;
    learningPurpose: string | null;
    weeklyGoalMinutes: number;
    timezone: string;
    uiLanguage: string;
    theme: string;
  } | null;
  subscription: {
    id: string;
    plan: Plan;
    status: SubStatus;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
  } | null;
  metrics: {
    id: string;
    totalStudyTimeMinutes: number;
    totalWordsTyped: number;
    lessonsCompleted: number;
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: Date | null;
    estimatedLevel: string | null;
  } | null;
  classUsers: {
    id: string;
    role: Role;
    class: {
      id: string;
      className: string;
      classCode: string;
      classStatus: ClassStatus;
    };
  }[];
}
