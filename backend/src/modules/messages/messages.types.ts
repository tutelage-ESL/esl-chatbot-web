import type { PronunciationResult } from "../ai/ai.types.ts";

export interface SendMessageResult {
  userMessage: {
    id: string;
    role: "USER";
    type: string;
    content: string;
    wordCount: number;
    createdAt: Date;
  };
  assistantMessage: {
    id: string;
    role: "ASSISTANT";
    type: string;
    content: string;
    wordCount: number;
    createdAt: Date;
  };
  evaluation: {
    grammarScore: number;
    grammarErrors: unknown;
    vocabularyScore: number;
    vocabularyLevel: string;
    fluencyScore: number;
    overallScore: number;
    detectedCefrLevel: string;
    corrections: unknown;
    feedback: string;
  };
}

export interface VoiceMessageResult {
  userMessage: {
    id: string;
    role: "USER";
    type: "VOICE";
    content: string; // transcript from STT
    wordCount: number | null;
    audioDurationSec: number | null;
    audioUrl: string | null; // R2 URL of the student recording (null if R2 not configured)
    createdAt: Date;
  };
  assistantMessage: {
    id: string;
    role: "ASSISTANT";
    type: "VOICE";
    content: string;
    wordCount: number | null;
    audioUrl: string | null; // R2 URL of the TTS MP3 (null if TTS/R2 failed or not configured)
    createdAt: Date;
  };
  evaluation: {
    grammarScore: number;
    grammarErrors: unknown;
    vocabularyScore: number;
    vocabularyLevel: string;
    fluencyScore: number;
    overallScore: number;
    detectedCefrLevel: string;
    corrections: unknown;
    feedback: string;
    pronunciationScore: number | null;
    pronunciationIssues: unknown;
  };
  audioBase64: string | null; // TTS audio as base64 MP3 — null if TTS not configured or failed
  pronunciation: PronunciationResult | null; // from Azure only (GOLD/PREMIUM); null for Dev/FREE
}
