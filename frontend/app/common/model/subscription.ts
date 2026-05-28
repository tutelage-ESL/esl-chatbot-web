export type Subscription = {
  id: string;
  userId: string;
  plan: 'FREE' | 'GOLD' | 'PREMIUM';
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'PAST_DUE';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  monthlyTtsUsage: number;
  lastUsageReset: string | null;
  paymentProvider: 'STRIPE' | 'FIB' | 'CASH' | null;
  externalCustomerId: string | null;
  externalSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FibSubscription = {
  id: string;
  userId: string;
  fibSubscriptionId: string;
  plan: 'GOLD' | 'PREMIUM';
  intervalMonths: 1 | 3 | 6 | 12;
  amountIQD: number;
  fibStatus: 'DRAFT' | 'TRIAL' | 'ACTIVE' | 'REJECTED' | 'CANCELLED';
  validUntil: string;
  activatedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
};
