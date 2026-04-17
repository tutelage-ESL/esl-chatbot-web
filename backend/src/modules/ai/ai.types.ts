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
