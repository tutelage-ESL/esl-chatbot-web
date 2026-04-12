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
