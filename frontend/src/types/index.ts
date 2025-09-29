export interface User {
  id: number;
  username: string;
  email: string;
  subscriptionTier: 'Free' | 'Standard' | 'Premium';
  monthlyTtsUsage: number;
  lastUsageReset: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  userId: number;
  content: string;
  sender: 'user' | 'bot';
  createdAt: string;
}

export interface Goal {
  id: number;
  userId: number;
  title: string;
  description: string;
  targetDate: string;
  completed: boolean;
  createdAt: string;
}

export interface Progress {
  id: number;
  userId: number;
  activity: string;
  score: number;
  completedAt: string;
}

export interface Vocabulary {
  id: number;
  userId: number;
  word: string;
  definition: string;
  example: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  mastered: boolean;
  createdAt: string;
}

export interface ChatMessage {
  user?: string;
  bot?: string;
  timestamp?: string;
}

export interface TierLimits {
  ttsMinutes: number;
  features: string[];
}

export interface UsageStats {
  totalUsage: number;
  remainingUsage: number;
  usagePercentage: number;
  tierLimits: TierLimits;
}