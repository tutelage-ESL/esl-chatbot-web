import type { SessionMode } from "@prisma/client";

export interface SessionListItem {
  id: string;
  mode: SessionMode;
  topic: string | null;
  /** AI-given name, renamable by the learner. Null until the first reply. */
  title: string | null;
  isPinned: boolean;
  summary: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  messageCount: number;
  createdAt: Date;
}

export interface SessionDetail extends SessionListItem {
  userId: string;
  aiContextSnapshot: unknown;
  messages: SessionMessage[];
  evaluation: SessionEvaluationData | null;
}

export interface SessionMessage {
  id: string;
  role: string;
  type: string;
  content: string;
  wordCount: number | null;
  audioUrl: string | null;
  audioDurationSec: number | null;
  createdAt: Date;
  evaluation: MessageEvaluationData | null;
}

export interface MessageEvaluationData {
  grammarScore: number;
  grammarErrors: unknown;
  vocabularyScore: number;
  vocabularyLevel: string;
  fluencyScore: number;
  pronunciationScore: number | null;
  pronunciationIssues: unknown;
  overallScore: number;
  detectedCefrLevel: string;
  corrections: unknown;
  feedback: string;
}

export interface SessionEvaluationData {
  topicsCovered: unknown;
  avgGrammarScore: number;
  avgVocabularyScore: number;
  avgFluencyScore: number;
  avgOverallScore: number;
  avgPronunciationScore: number | null;
  detectedCefrLevel: string;
  strengths: unknown;
  weaknesses: unknown;
  recommendations: unknown;
  newVocabulary: unknown;
  totalUserMessages: number;
  totalUserWords: number;
}

export interface SessionDayStat {
  date: string;
  sessionCount: number;
  totalDurationSeconds: number;
}

export interface SessionStatsData {
  days: number;
  totalSessions: number;
  averageDurationSeconds: number;
  dailyStats: SessionDayStat[];
}

/** Why a new conversation can't start right now (null = it can). */
export type SessionBlockReason = "INACTIVE" | "SESSION_LIMIT" | "MESSAGE_LIMIT";

export interface SessionUsageData {
  plan: "FREE" | "GOLD" | "PREMIUM";
  active: boolean;
  sessionsToday: number;
  sessionsPerDay: number;
  messagesToday: number;
  /** Only FREE has a daily message cap; null = no cap. */
  messagesPerDay: number | null;
  canStart: boolean;
  reason: SessionBlockReason | null;
  /** Seconds until the daily counters reset (local midnight on the server). */
  resetsInSeconds: number;
}
