import type { Role, GoalType, GoalStatus } from "@prisma/client";

export interface SearchUserResult {
  id: string;
  displayName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
}

export interface SearchClassResult {
  id: string;
  className: string;
  classCategory: string | null;
}

export interface SearchVocabResult {
  id: string;
  word: string;
  definition: string;
}

export interface SearchGoalResult {
  id: string;
  description: string;
  type: GoalType;
  status: GoalStatus;
}

export interface SearchSessionResult {
  id: string;
  topic: string | null;
  startedAt: Date;
}

export interface GlobalSearchResults {
  query: string;
  results: {
    users: SearchUserResult[];
    classes: SearchClassResult[];
    vocabulary: SearchVocabResult[];
    goals: SearchGoalResult[];
    sessions: SearchSessionResult[];
  };
  total: number;
}
