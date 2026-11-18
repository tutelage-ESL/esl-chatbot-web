import type { ClassStatus } from "@prisma/client";
import type { SkillSnapshot } from "../metrics/skills.service.ts";

/** How a student is doing with this class's tasks. */
export interface TaskRecord {
  total: number;
  /** Includes late and reviewed hand-ins */
  handedIn: number;
  late: number;
  /** Past the deadline and not handed in */
  missing: number;
  reviewed: number;
}

export interface StudentTaskItem {
  id: string;
  title: string;
  deadline: Date | null;
  taskStatus: "OPEN" | "CLOSED";
  state: "ASSIGNED" | "MISSING" | "CLOSED" | "HANDED_IN" | "LATE" | "REVIEWED";
  handedInAt: Date | null;
}

export interface StudentMistake {
  /** The grammar rule (or the error itself when the AI gave no rule) */
  rule: string;
  count: number;
  example: { said: string; better: string } | null;
}

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
  fluencySkill: number;
  /** 0 until the student has spoken in a voice chat */
  speakingSkill: number;
  /** Last message to the AI tutor; null = never practised (skills mean nothing yet) */
  lastPracticeAt: Date | null;
  tasks: TaskRecord;
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
  /** Fresh averages of the latest scored messages, with how many messages they rest on */
  skills: SkillSnapshot;
  practice: {
    lastPracticeAt: Date | null;
    /** Chats with at least one message */
    chats: number;
    totalStudyTimeMinutes: number;
    currentStreak: number;
    longestStreak: number;
  };
  tasks: StudentTaskItem[];
  taskSummary: TaskRecord;
  /** Most frequent grammar mistakes in the last 30 days */
  mistakes: StudentMistake[];
}

export interface ClassListItem {
  id: string;
  className: string;
  classCode: string;
  classCategory: string | null;
  classStatus: ClassStatus;
  archived: boolean;
  archivedAt: Date | null;
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
  archived: boolean;
  archivedAt: Date | null;
  classCodeBlocked: boolean;
  classCodeExpiresAt: Date | null;
  classCodeRefreshIntervalSeconds: number | null;
  classCodeRefreshedAt: Date;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: ClassMember[];
  /**
   * The calling user's own class-membership role, or null if they are not a
   * member (e.g. an admin reading a class they don't belong to). Derived from
   * a direct membership lookup, NOT from `members` — so it is still correct
   * when the caller is filtered out of `members` (internal/stealth accounts).
   * Lets clients gate tutor-only UI without scanning `members` for themselves.
   */
  myRole: "STUDENT" | "TUTOR" | null;
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
  /** Averages over students who have practised (0 = nobody yet) */
  averageSkills: { grammar: number; vocabulary: number; fluency: number; speaking: number };
  /** Students with at least one scored message */
  practisingStudents: number;
  mostCommonGrammarErrors: GrammarErrorEntry[];
  vocabularyCoverage: number;
}
