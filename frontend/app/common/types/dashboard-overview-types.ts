// ─── Dashboard Overview — API response types ─────────────────────────────────
// These mirror backend/src/modules/dashboard/dashboard.types.ts exactly.
// Never edit manually — update the backend type first, then mirror here.

export interface OverviewGreetingHero {
  streak: number
  doneMins: number
  goalMins: number
  dueVocabCount: number
}

export interface OverviewStatCards {
  wordsMastered: number
  wordsMasteredWeekDelta: number
  practiceTimeMinutes: number
  practiceTimeThisMonthMinutes: number
  pronunciationScore: number
  pronunciationDelta: number | null
  currentLevel: string | null
  levelPct: number
}

export interface OverviewVocabChartPoint {
  label: string // "May 5", "May 12", …
  value: number // cumulative total at that week-end
}

export interface OverviewVocabChart {
  points: OverviewVocabChartPoint[]
  totalWords: number
  growthPct: number // % change vs 30 days ago; 0 if no prior data
}

export interface OverviewGoalItem {
  id: string
  type: string         // GoalType enum value e.g. "VOCABULARY"
  description: string
  target: number
  progress: number     // 0–100
  difficulty: string | null
  targetDate: string | null // ISO date-time
}

export interface OverviewNextUp {
  primary: OverviewGoalItem | null
  others: OverviewGoalItem[]
}

export interface OverviewHeatmapSession {
  id: string
  mode: 'TEXT' | 'VOICE'
  topic: string | null
  startedAt: string           // ISO date-time
  durationSeconds: number | null
  messageCount: number
  avgOverallScore: number | null
  avgPronunciationScore: number | null
}

export interface OverviewActivityHeatmap {
  weeks: number[][]           // 12 rows × 7 cols, value 0–7 (clamped sessions/day)
  activePct: number           // % of last 84 days where sessionsCount > 0
  recentSessions: OverviewHeatmapSession[]
}

export interface OverviewDueWord {
  word: string
  definition: string
  srsDue: string              // ISO — format on the frontend ("now", "in 1h", "tomorrow")
}

export interface OverviewDueWords {
  words: OverviewDueWord[]
  totalDue: number
  levelPct: number            // 0–100 based on CEFR position (A1=0 … C2=100)
}

export interface DashboardOverviewData {
  greetingHero: OverviewGreetingHero
  statCards: OverviewStatCards
  vocabChart: OverviewVocabChart
  nextUp: OverviewNextUp
  activityHeatmap: OverviewActivityHeatmap
  dueWords: OverviewDueWords
}
