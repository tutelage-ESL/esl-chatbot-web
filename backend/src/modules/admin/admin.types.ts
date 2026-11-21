import type { Plan, SubStatus, PaymentProvider, Role } from "@prisma/client";
import type { StudentMistake } from "../classes/classes.types.ts";
import type { TutorClassHealth } from "../tutor/tutor.service.ts";

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
  people: AdminPeople;
  /** Every class that isn't archived, biggest first, with its teacher */
  classes: AdminClassRow[];
  /** The last 30 days (UTC), oldest first */
  trend: AdminTrendDay[];
  learning: AdminLearning;
}

export interface AdminPeople {
  /** Newest accounts, any role */
  newest: { id: string; name: string; username: string; role: Role; verified: boolean; plan: Plan; joinedAt: Date }[];
  /** Students with the most practice in the last 7 days (from daily progress) */
  mostActive: { id: string; name: string; minutes: number; messages: number; plan: Plan }[];
  /** Students who practised before but not in the last 7 days, most recently quiet first */
  goneQuiet: { id: string; name: string; lastPracticeAt: Date; plan: Plan }[];
  goneQuietCount: number;
}

export interface AdminClassRow extends TutorClassHealth {
  teacher: { id: string; name: string } | null;
}

export interface AdminTrendDay {
  /** YYYY-MM-DD */
  date: string;
  signUps: number;
  activeLearners: number;
  messages: number;
}

export interface AdminLearning {
  /** Average of each skill over students who have practised (0 = no data); speaking only over voice users */
  skills: { grammar: number; vocabulary: number; fluency: number; speaking: number; practisingStudents: number };
  /** Students by the level the AI hears (UserMetrics.estimatedLevel); "NONE" = not measured yet */
  levels: Record<string, number>;
  commonMistakes: StudentMistake[];
  /** Conversations started in the last 7 days */
  modes: { chat: number; voice: number; voiceMinutes: number };
  /** Students who sent the AI tutor the most messages in the last 7 days */
  heavyUsers: { id: string; name: string; messages: number; plan: Plan }[];
}
