import type { SessionMode } from "@prisma/client";

export interface SessionListItem {
  id: string;
  mode: SessionMode;
  topic: string | null;
  summary: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  messageCount: number;
  averageScore: number | null;
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
  detectedCefrLevel: string;
  strengths: unknown;
  weaknesses: unknown;
  recommendations: unknown;
  newVocabulary: unknown;
  totalUserMessages: number;
  totalUserWords: number;
}
