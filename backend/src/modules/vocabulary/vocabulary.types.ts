import type { VocabSource, Role } from "@prisma/client";

/** The tutor/admin who assigned a word — present only when source = ASSIGNED. */
export interface VocabAssigner {
  id: string;
  displayName: string;
  role: Role;
}

export interface VocabularyItem {
  id: string;
  userId: string;
  word: string;
  definition: string;
  pronunciation: string | null;
  example: string | null;
  partOfSpeech: string | null;
  difficulty: number;
  category: string | null;
  source: VocabSource;
  assignedByTutorId: string | null;
  assignedByTutor: VocabAssigner | null;
  srsInterval: number;
  srsDue: Date;
  srsEase: number;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  masteryLevel: number;
  lastPracticed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VocabularyStats {
  total: number;
  dueToday: number;
  learnedThisWeek: number;
  byMasteryLevel: {
    new: number;      // masteryLevel 0
    seen: number;     // masteryLevel 1
    learning: number; // masteryLevel 2
    familiar: number; // masteryLevel 3
    proficient: number; // masteryLevel 4
    mastered: number; // masteryLevel 5
  };
}

export interface ReviewResult {
  id: string;
  word: string;
  srsInterval: number;
  srsDue: Date;
  srsEase: number;
  masteryLevel: number;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  lastPracticed: Date;
}
