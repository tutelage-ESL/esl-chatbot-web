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
