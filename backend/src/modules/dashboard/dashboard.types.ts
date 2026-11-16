export interface DashboardGreetingHero {
  streak: number;
  doneMins: number;
  goalMins: number;
  dueVocabCount: number;
}

export interface DashboardStatCards {
  wordsMastered: number;
  wordsMasteredWeekDelta: number;
  practiceTimeMinutes: number;
  practiceTimeThisMonthMinutes: number;
  pronunciationScore: number;
  pronunciationDelta: number | null;
  currentLevel: string | null;
  levelPct: number;
}

export interface DashboardVocabChartPoint {
  label: string; // "May 5", "May 12", etc.
  value: number; // cumulative total at that week
}

export interface DashboardVocabChart {
  points: DashboardVocabChartPoint[];
  totalWords: number;
  growthPct: number; // % change vs 30 days ago; 0 if no prior data
}

export interface DashboardGoalItem {
  id: string;
  type: string;
  description: string;
  target: number;
  progress: number;
  difficulty: string | null;
  targetDate: string | null; // ISO date string
}

export interface DashboardNextUp {
  primary: DashboardGoalItem | null;
  others: DashboardGoalItem[];
}

export interface DashboardHeatmapSession {
  id: string;
  mode: "TEXT" | "VOICE";
  topic: string | null;
  startedAt: string; // ISO
  durationSeconds: number | null;
  messageCount: number;
  avgOverallScore: number | null;
  avgPronunciationScore: number | null;
}

export interface DashboardActivityHeatmap {
  weeks: number[][]; // 12 rows × 7 cols, value = sessionsCount that day (0 if no Progress row)
  activePct: number; // % of last 84 days where sessionsCount > 0
  recentSessions: DashboardHeatmapSession[];
}

export interface DashboardDueWord {
  word: string;
  definition: string;
  srsDue: string; // ISO — frontend formats as "now" / "in 1h" / "tomorrow"
}

export interface DashboardDueWords {
  words: DashboardDueWord[];
  totalDue: number;
  levelPct: number; // 0–100 based on estimatedLevel CEFR position
}

export interface DashboardOverviewData {
  greetingHero: DashboardGreetingHero;
  statCards: DashboardStatCards;
  vocabChart: DashboardVocabChart;
  nextUp: DashboardNextUp;
  activityHeatmap: DashboardActivityHeatmap;
  dueWords: DashboardDueWords;
}

export type VocabGrowthRange = "7d" | "30d" | "all";

export interface DashboardVocabGrowth {
  points: DashboardVocabChartPoint[];
  totalWords: number;
  growthPct: number;
  range: VocabGrowthRange;
}
