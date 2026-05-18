export interface ProgressEntry {
  id: string;
  userId: string;
  date: Date;
  sessionsCount: number;
  studyMinutes: number;
  messagesCount: number;
  wordsTyped: number;
  vocabularyPracticed: number;
  goalsAdvanced: number;
  pronunciationScore: number | null;
  skillSnapshot: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressSummaryDay {
  date: string;
  sessionsCount: number;
  studyMinutes: number;
  messagesCount: number;
  wordsTyped: number;
  vocabularyPracticed: number;
}
