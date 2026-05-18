export interface MetricsData {
  id: string;
  userId: string;
  totalStudyTimeMinutes: number;
  totalWordsTyped: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date | null;
  estimatedLevel: string | null;
  grammarSkill: number;
  vocabularySkill: number;
  fluencySkill: number;
  speakingSkill: number;
  createdAt: Date;
  updatedAt: Date;
}
