// API response shapes + UI types for the vocabulary page.
// The base table shape lives in common/model/vocabulary.ts.

import type { Vocabulary, VocabSource } from '~/common/model/vocabulary'

// ─── API: list item ───────────────────────────────────────────────────────────
// The list/due/get/add/update endpoints all return the full Vocabulary row.
export type VocabularyItem = Vocabulary

// ─── API: GET /vocabulary/stats ──────────────────────────────────────────────
export interface VocabularyStats {
  total: number
  dueToday: number
  learnedThisWeek: number
  byMasteryLevel: {
    new: number // masteryLevel 0
    seen: number // masteryLevel 1
    learning: number // masteryLevel 2
    familiar: number // masteryLevel 3
    proficient: number // masteryLevel 4
    mastered: number // masteryLevel 5
  }
}

// ─── API: POST /vocabulary/:id/review response ───────────────────────────────
export interface ReviewResult {
  id: string
  word: string
  srsInterval: number
  srsDue: string
  srsEase: number
  masteryLevel: number
  reviewCount: number
  correctCount: number
  incorrectCount: number
  lastPracticed: string
}

// ─── API: request shapes ──────────────────────────────────────────────────────
export interface AddVocabularyInput {
  word: string
  definition: string
  pronunciation?: string
  example?: string
  partOfSpeech?: string
  difficulty?: number // 1–5, default 1
  category?: string
}

export interface UpdateVocabularyInput {
  definition?: string
  pronunciation?: string | null
  example?: string | null
  partOfSpeech?: string | null
  difficulty?: number
  category?: string | null
}

export interface ListVocabularyParams {
  page?: number
  limit?: number
  due?: 'true' | 'false'
  source?: VocabSource
  category?: string
  search?: string
}

// SM-2 quality rating: 0=blackout … 5=perfect recall
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5

// Flashcard "Again / Hard / Good / Easy" → SM-2 quality
export type SrsRating = 'Again' | 'Hard' | 'Good' | 'Easy'

export const RATING_QUALITY: Record<SrsRating, ReviewQuality> = {
  Again: 0,
  Hard: 1,
  Good: 3,
  Easy: 5,
}

// masteryLevel (0–5) → human label, used for the per-card progress indicator
export const MASTERY_LABEL: Record<number, string> = {
  0: 'New',
  1: 'Seen',
  2: 'Learning',
  3: 'Familiar',
  4: 'Proficient',
  5: 'Mastered',
}

export interface VocabPaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}
