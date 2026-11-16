import type { Plan, SubStatus, PaymentProvider } from "@prisma/client";

export interface SubscriptionResult {
  id: string;
  plan: Plan;
  status: SubStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  paymentProvider: PaymentProvider | null;
  updatedAt: Date;
}

export interface AdminDashboardData {
  users: {
    total: number;
    byRole: { STUDENT: number; TUTOR: number; ADMIN: number };
  };
  subscriptions: { FREE: number; GOLD: number; PREMIUM: number };
  activeUsers: { daily: number; weekly: number };
  totalSessionsToday: number;
  revenueByProvider: Record<string, number>;
}
