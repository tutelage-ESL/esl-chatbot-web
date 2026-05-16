import type { Plan, Role, SubStatus } from "@prisma/client";

export interface SubscriptionResult {
  id: string;
  plan: Plan;
  status: SubStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  updatedAt: Date;
}
