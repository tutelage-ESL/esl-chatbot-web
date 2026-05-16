import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import type { PaymentProvider } from "@prisma/client";
import type { SubscriptionResult } from "./admin.types.ts";
import type { UpdateUserBody, AssignSubscriptionBody } from "./admin.schema.ts";

function computeEndDate(durationMonths: number): Date {
  // setUTCMonth avoids local-timezone overflow (e.g. Jan 31 + 1 month = Mar 3 in setMonth)
  const end = new Date();
  end.setUTCMonth(end.getUTCMonth() + durationMonths);
  return end;
}

// Maps validated string from schema to Prisma PaymentProvider enum value
function toPaymentProvider(value: PaymentProvider | undefined): PaymentProvider {
  return value ?? "CASH";
}

function isP2025(err: unknown): boolean {
  return (err as { code?: string }).code === "P2025";
}

export async function updateUser(id: string, data: UpdateUserBody) {
  try {
    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isActive: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      },
    });
  } catch (err) {
    if (isP2025(err)) throw new AppError("User not found", 404);
    throw err;
  }
}

export async function assignSubscription(
  userId: string,
  data: AssignSubscriptionBody,
): Promise<SubscriptionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new AppError("User not found", 404);

  const now = new Date();
  const isPaidPlan = data.plan !== "FREE";

  // FREE plan is permanent — no period dates needed
  const currentPeriodStart = isPaidPlan ? now : null;
  const currentPeriodEnd = isPaidPlan
    ? (data.endDate ? new Date(data.endDate) : computeEndDate(data.durationMonths!))
    : null;

  const paymentProvider = toPaymentProvider(data.paymentProvider);

  return prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: data.plan,
      status: "ACTIVE",
      currentPeriodStart,
      currentPeriodEnd,
      paymentProvider,
    },
    update: {
      plan: data.plan,
      status: "ACTIVE",
      currentPeriodStart,
      currentPeriodEnd,
      paymentProvider,
      externalCustomerId: null,
      externalSubscriptionId: null,
    },
    select: {
      id: true,
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      paymentProvider: true,
      updatedAt: true,
    },
  });
}

export async function cancelSubscription(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, subscription: { select: { id: true } } },
  });
  if (!user) throw new AppError("User not found", 404);
  if (!user.subscription) throw new AppError("User has no subscription to cancel", 404);

  // Downgrade to FREE ACTIVE — user retains AI access at FREE limits.
  // To block all access, use PATCH /admin/users/:id with isActive=false instead.
  await prisma.subscription.update({
    where: { userId },
    data: {
      plan: "FREE",
      status: "ACTIVE",
      currentPeriodEnd: null,
      currentPeriodStart: null,
      paymentProvider: null,
      externalCustomerId: null,
      externalSubscriptionId: null,
    },
  });
}
