import type { SkillSnapshot } from "../metrics/skills.service.ts";

// Learner home dashboard. Every "today" / "this week" is the learner's own calendar day
// (utils/learnerDay.ts), and every number is something they can act on.

export interface LearnerToday {
  /** YYYY-MM-DD in the learner's time zone */
  date: string;
  minutes: number;
  /** weeklyGoalMinutes / 7 */
  dailyGoalMinutes: number;
  /** 0 once a whole day was missed (even before the hourly reset job runs) */
  streak: number;
  longestStreak: number;
}

export interface LearnerWeek {
  /** Monday → Sunday of the current week; minutes is null for days still to come */
  days: { date: string; minutes: number | null }[];
  minutes: number;
  weeklyGoalMinutes: number;
}

export interface LearnerSkills extends SkillSnapshot {
  /** Level the learner picked for themselves */
  selfLevel: string | null;
  targetLevel: string | null;
}

export interface LearnerVocab {
  total: number;
  /** SRS cards due for review now */
  due: number;
  /** masteryLevel 5 */
  mastered: number;
  /** Words added in the last 7 days */
  addedThisWeek: number;
  /** The first few due words, oldest due first */
  dueWords: { word: string; definition: string }[];
}

export interface LearnerTask {
  id: string;
  classId: string;
  className: string;
  title: string;
  deadline: Date | null;
  state: "ASSIGNED" | "MISSING";
}

export interface LearnerGoal {
  id: string;
  type: string;
  description: string;
  target: number;
  progress: number;
  targetDate: Date | null;
}

export interface LearnerActivity {
  /** 12 weeks, Monday-start, oldest first; minutes per day, null = day still to come */
  weeks: (number | null)[][];
  /** YYYY-MM-DD of the first cell */
  firstDay: string;
  activeDays: number;
}

export interface LearnerRecentChat {
  id: string;
  title: string | null;
  topic: string | null;
  mode: "TEXT" | "VOICE";
  startedAt: Date;
  messageCount: number;
  /** Average overall score of the chat; null while it's still open */
  score: number | null;
}

export interface DashboardOverviewData {
  today: LearnerToday;
  week: LearnerWeek;
  skills: LearnerSkills;
  vocab: LearnerVocab;
  tasks: LearnerTask[];
  goals: LearnerGoal[];
  activity: LearnerActivity;
  recentChats: LearnerRecentChat[];
}

// ── Vocabulary growth (vocab page chart) ──────────────────────────────────────

export interface DashboardVocabChartPoint {
  label: string;
  value: number;
}

export type VocabGrowthRange = "7d" | "30d" | "all";

export interface DashboardVocabGrowth {
  points: DashboardVocabChartPoint[];
  totalWords: number;
  /** null when they had no words at the start of the range (growth from 0 isn't a %) */
  growthPct: number | null;
  range: VocabGrowthRange;
}
