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
  /** The class word list this word came from (assigned to a class), else null. */
  listId: string | null;
  list: { id: string; title: string } | null;
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

/** A word list assigned to a class (GET /classes/:classId/vocabulary-lists). */
export interface ClassWordList {
  id: string;
  title: string;
  createdAt: Date;
  createdBy: { id: string; displayName: string } | null;
  words: { word: string; definition: string; example: string | null; partOfSpeech: string | null }[];
  studentCount: number;
  /** Share of the students' copies reviewed at least once / mastered (level 5). */
  practisedPct: number;
  masteredPct: number;
}

export interface ClassWordListCreated {
  id: string;
  title: string;
  createdAt: Date;
  wordCount: number;
  studentCount: number;
  /** Words actually added (students who already had a word keep their own copy). */
  added: number;
  skipped: number;
}
