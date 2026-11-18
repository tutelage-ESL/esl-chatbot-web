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
  users: { total: number; students: number; tutors: number; admins: number; newThisWeek: number; newLastWeek: number };
  /** Active = sent the AI tutor a message in the window */
  activity: { active24h: number; activeThisWeek: number; activeLastWeek: number; messagesThisWeek: number; messagesLastWeek: number };
  /** Students: signed up → verified (subscription active) → practised (≥1 message) → paying now */
  funnel: { signedUp: number; verified: number; practised: number; paying: number };
  /** Active plans; paid ones only while their period hasn't ended */
  plans: { FREE: number; GOLD: number; PREMIUM: number; expiredNotDowngraded: number };
  revenue: {
    /** FIB money from subscriptions activated this calendar month (UTC); renewal charges aren't stored */
    fibThisMonthIQD: number;
    fibThisMonthCount: number;
    fibLastMonthIQD: number;
    payingByProvider: Record<string, number>;
  };
  expiringSoon: { userId: string; name: string; plan: Plan; endsAt: Date; cancelling: boolean }[];
  /** Messages sent to the AI tutor in the last 7 days, by the sender's plan */
  aiUsage: Record<Plan, number>;
  attention: { unverifiedOver24h: number; fibPaymentsStuck: number };
}
