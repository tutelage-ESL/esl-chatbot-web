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
}

export interface ConversationMessage {
  role: string;
  content: string;
}

export interface LearnerContext {
  currentLevel: string | null;
  targetLevel: string | null;
  learningPurpose: string | null;
  aiPersonality: string | null;
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
