import type { Plan } from "@prisma/client";

export type FibSubStatusType =
  | "DRAFT"
  | "TRIAL"
  | "ACTIVE"
  | "REJECTED"
  | "CANCELLED";

export type InitiateFibInput = {
  plan: Extract<Plan, "GOLD" | "PREMIUM">;
  intervalMonths: 1 | 3 | 6 | 12;
};

export type InitiateFibResult = {
  fibSubscriptionId: string;
  readableCode: string;
  qrCode: string;
  appLink: string;
  validUntil: string;
};

export type FibStatusResult = {
  fibStatus: FibSubStatusType;
  plan: Extract<Plan, "GOLD" | "PREMIUM">;
  intervalMonths: number;
  amountIQD: number;
  activeUntil: Date | null;
  lastPaymentAt: Date | null;
};
