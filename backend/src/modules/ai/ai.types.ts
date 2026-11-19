export interface GrammarError {
  error: string;
  correction: string;
  rule: string;
  severity: "minor" | "major" | "critical";
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

export interface NewVocabularyWord {
  word: string;
  definition: string;
  partOfSpeech?: string;
  example?: string;
}

export interface MessageEvaluationResult {
  grammarScore: number;
  grammarErrors: GrammarError[];
  vocabularyScore: number;
  vocabularyLevel: string;
  fluencyScore: number;
  overallScore: number;
  detectedCefrLevel: string;
  corrections: Correction[];
  feedback: string;
  newWords: NewVocabularyWord[];
}

export interface AIResponse {
  reply: string;
  evaluation: MessageEvaluationResult;
  /** 2-4 word name for the conversation; saved only while the session has none. */
  title?: string;
  /** The complete new long-term memory list (memory.service.ts); null = keep it unchanged. */
  memory?: string[] | null;
}

export interface ConversationMessage {
  role: string;
  content: string;
}

/** spoken = the student spoke (voice message or call): short reply read aloud, quick model settings. */
export interface ReplyOptions {
  spoken?: boolean;
}

export interface LearnerContext {
  currentLevel: string | null;
  targetLevel: string | null;
  learningPurpose: string | null;
  aiPersonality: string | null;
  /** "ku" = the student uses the app in Kurdish; the tutor then explains in Sorani too. */
  uiLanguage?: string | null;
  /** What the tutor remembers about the student (memory.service.ts). */
  memory?: LearnerMemory | null;
  /** "GB" = British English (spelling, words, and accent on calls); otherwise American. */
  tutorAccent?: string | null;
}

export interface LearnerMemory {
  name: string | null;
  /** Important facts the tutor chose to keep about the student, across all chats. */
  facts: string[];
}

export interface PronunciationIssue {
  word: string;
  issue: string;
  suggestion: string;
}

export interface PronunciationResult {
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null; // null for GOLD (basic assessment), number for PREMIUM (full)
  overallScore: number;
  issues: PronunciationIssue[];
}

export interface STTWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  words: STTWord[];
  pronunciation?: PronunciationResult; // populated for GOLD/PREMIUM via Azure, absent for Dev/FREE
}
