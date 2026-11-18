import type { PronunciationResult } from "../ai/ai.types.ts";

export interface LiveCallStart {
  sessionId: string;
  /** One-use Gemini Live token, locked to `model` and the tutor's instructions. */
  token: string;
  model: string;
  /** The token stops opening new calls after this; an open call may run until expiresAt. */
  expiresAt: string;
}

export interface LiveTurnScores {
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  overallScore: number;
  detectedCefrLevel: string;
  vocabularyLevel: string;
  feedback: string;
}

export interface LiveTurnSaved {
  /** Gold/Premium: Azure pronunciation of the learner's audio; null otherwise or on failure. */
  pronunciation: PronunciationResult | null;
  /** null when the scorer was busy; the turn is still saved. */
  evaluation: LiveTurnScores | null;
  /** FREE's messages left today; null = no daily cap. 0 = end the call. */
  remainingMessages: number | null;
}
