// ─── Navigation ───────────────────────────────────────────────────────────────

export type DashboardNavId =
  | 'overview'
  | 'chat'
  | 'voice'
  | 'vocab'
  | 'goals'
  | 'lessons'
  | 'profile'
  | 'settings'

export interface DashboardNavItem {
  id: DashboardNavId
  label: string
  icon: string
  badge?: number
  path: string
}

// ─── Overview – Stat Cards ────────────────────────────────────────────────────

export interface StatCard {
  label: string
  value: string
  delta: string
  icon: string
}

// ─── Overview – Chart ─────────────────────────────────────────────────────────

export type ChartRange = '7d' | '30d' | 'All'

export interface ChartPoint {
  label: string
  value: number
}

// ─── Overview – Upcoming Lessons ──────────────────────────────────────────────

export interface UpcomingLesson {
  title: string
  tag: string
  minutes: number
  level: string
  icon: string
}

// ─── Overview – Recent Sessions ───────────────────────────────────────────────

export interface RecentSession {
  type: string
  topic: string
  time: string
  meta: string
  icon: string
}

// ─── Overview – Due Words ─────────────────────────────────────────────────────

export interface DueWord {
  word: string
  meaning: string
  due: string
}

// ─── Overview – Heatmap ───────────────────────────────────────────────────────

export type HeatWeek = number[] // length 7, values 0-7

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: number | string
  title: string
  when: string
  active?: boolean
  preview: string
}

export interface ChatMessage {
  who: 'ai' | 'user'
  text: string
  time: string
  correction?: {
    original: string
    suggested: string
    why: string
  }
}

// ─── Voice Lab ────────────────────────────────────────────────────────────────

export interface PhonemeScore {
  word: string
  score: number
  issue: string | null
}

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export interface VocabCard {
  word: string
  phonetic: string
  pos: string
  definition: string
  example: string
  tags: string[]
}

export interface VocabDeck {
  name: string
  count: number
  due: number
  gradient: string
}

export type SrsRating = 'Again' | 'Hard' | 'Good' | 'Easy'

// ─── Goals ────────────────────────────────────────────────────────────────────

export interface Goal {
  title: string
  progress: number
  due: string
  current: string
}

export interface Achievement {
  title: string
  description: string
  icon: string
  earned: boolean
  progress?: number
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export type LessonCategory = 'All' | 'Business' | 'Travel' | 'Grammar' | 'Real-life' | 'Pronunciation' | 'Exams'

export interface Lesson {
  title: string
  category: Exclude<LessonCategory, 'All'>
  minutes: number
  level: string
  popular?: boolean
}
