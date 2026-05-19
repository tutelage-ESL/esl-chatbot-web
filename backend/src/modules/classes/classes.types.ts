import type { ClassStatus } from "@prisma/client";

/** Tutor/admin view of a student in a class — includes progress snapshot. */
export interface ClassStudentSummary {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: Date;
  currentLevel: string | null;
  targetLevel: string | null;
  currentStreak: number;
  estimatedLevel: string | null;
  totalStudyTimeMinutes: number;
  grammarSkill: number;
  vocabularySkill: number;
  vocabTotal: number;
  vocabDueToday: number;
}

/** Full student detail seen by a tutor or admin. */
export interface ClassStudentDetail {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: Date;
  learnerProfile: {
    currentLevel: string | null;
    targetLevel: string | null;
    learningPurpose: string | null;
    topicsOfInterest: unknown;
    weeklyGoalMinutes: number;
    timezone: string;
    aiPersonality: string | null;
  } | null;
  metrics: {
    currentStreak: number;
    longestStreak: number;
    estimatedLevel: string | null;
    totalStudyTimeMinutes: number;
    grammarSkill: number;
    vocabularySkill: number;
    fluencySkill: number;
    speakingSkill: number;
    lastStudyDate: Date | null;
  } | null;
  vocabTotal: number;
  vocabDueToday: number;
}

export interface ClassListItem {
  id: string;
  className: string;
  classCode: string;
  classCategory: string | null;
  classStatus: ClassStatus;
  classCodeBlocked: boolean;
  classCodeExpiresAt: Date | null;
  classCodeRefreshIntervalSeconds: number | null;
  createdAt: Date;
  memberCount: number;
}

export interface ClassMember {
  id: string;
  role: "STUDENT" | "TUTOR";
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface ClassDetail {
  id: string;
  className: string;
  classCode: string;
  classCategory: string | null;
  classStatus: ClassStatus;
  classCodeBlocked: boolean;
  classCodeExpiresAt: Date | null;
  classCodeRefreshIntervalSeconds: number | null;
  classCodeRefreshedAt: Date;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: ClassMember[];
}

/** Public-facing summary of the join code only — used by code-management endpoints. */
export interface ClassCodeInfo {
  classId: string;
  classCode: string;
  classCodeBlocked: boolean;
  classCodeExpiresAt: Date | null;
  classCodeRefreshIntervalSeconds: number | null;
  classCodeRefreshedAt: Date;
}

/** Result returned by the join-by-code endpoint. */
export interface JoinClassResult {
  classId: string;
  className: string;
  classCode: string;
  role: "STUDENT" | "TUTOR";
  joinedAt: Date;
}

export interface GrammarErrorEntry {
  error: string;
  count: number;
}

export interface ClassAnalytics {
  classId: string;
  className: string;
  studentCount: number;
  averageSkills: { grammar: number; vocabulary: number; fluency: number };
  mostCommonGrammarErrors: GrammarErrorEntry[];
  vocabularyCoverage: number;
}
