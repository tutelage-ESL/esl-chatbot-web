import type { VocabSource } from "@prisma/client";

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
