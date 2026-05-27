import { FibSubscribeError } from "../../lib/fib-client.ts";
import { prisma } from "../../config/database.ts";
import { fib } from "../../config/fib.ts";
import { AppError } from "../../utils/AppError.ts";
import { env } from "../../config/env.ts";
import type {
  InitiateFibInput,
  InitiateFibResult,
  FibStatusResult,
  FibSubStatusType,
} from "./subscriptions.types.ts";

// ── Pricing table (IQD) — update when business owner confirms amounts ─────────
// These values are locked in at subscription creation time; changing them only
// affects new subscribers, not existing active FIB subscriptions.
const PLAN_AMOUNTS_IQD: Record<string, Record<number, number>> = {
  GOLD:    { 1: 25_000, 3: 70_000,  6: 130_000, 12: 250_000 },
  PREMIUM: { 1: 45_000, 3: 125_000, 6: 230_000, 12: 440_000 },
};

const INTERVAL_ISO: Record<number, string> = {
  1: "P1M",
  3: "P3M",
  6: "P6M",
  12: "P1Y",
};

function requireFib() {
  if (!fib) {
    throw new AppError(
      "FIB integration not configured. Set FIB_CLIENT_ID and FIB_CLIENT_SECRET in Infisical.",
      503,
    );
  }
  return fib;
}

// ─── Initiate ─────────────────────────────────────────────────────────────────

export async function initiateFibSubscription(
  userId: string,
  input: InitiateFibInput,
): Promise<InitiateFibResult> {
  const client = requireFib();
  const { plan, intervalMonths } = input;

  // Guard: cross-provider conflicts — cannot layer FIB on top of another active provider
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing?.status === "ACTIVE") {
    if (existing.paymentProvider === "CASH") {
      throw new AppError(
        "Your subscription is managed by an admin (CASH). Contact support to change plans.",
        409,
      );
    }
    if (existing.paymentProvider === "STRIPE") {
      throw new AppError(
        "You have an active Stripe subscription. Cancel it before switching to FIB.",
        409,
      );
    }
    if (existing.paymentProvider === "FIB") {
      throw new AppError(
        "You already have an active FIB subscription. Cancel it before starting a new one.",
        409,
      );
    }
  }

  const amountIQD = PLAN_AMOUNTS_IQD[plan]?.[intervalMonths];
  if (!amountIQD) throw new AppError("Invalid plan or interval combination", 400);

  // Create subscription at FIB. statusCallbackUrl is only set when FIB_WEBHOOK_URL is
  // configured (i.e. a publicly accessible URL). In local dev, omit it and use polling.
  let fibSub: Awaited<ReturnType<typeof client.createSubscription>>;
  try {
    fibSub = await client.createSubscription({
      title: `Tutelage ${plan}`,
      description: `${plan} English learning plan`,
      amount: amountIQD,
      currency: "IQD",
      interval: INTERVAL_ISO[intervalMonths]!,
      expiresIn: "P1DT12H",
      ...(env.FIB_WEBHOOK_URL
        ? { statusCallbackUrl: env.FIB_WEBHOOK_URL }
        : {}),
    });
  } catch (err) {
    if (err instanceof FibSubscribeError) {
      console.error("[FIB] createSubscription error", { status: err.statusCode, body: err.body });
      throw new AppError(`FIB error: ${err.message}`, 502);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }

  await prisma.fibSubscription.create({
    data: {
      userId,
      fibSubscriptionId: fibSub.subscriptionId,
      plan,
      intervalMonths,
      amountIQD,
      fibStatus: "DRAFT",
      validUntil: new Date(fibSub.validUntil),
    },
  });

  return {
    fibSubscriptionId: fibSub.subscriptionId,
    readableCode: fibSub.readableCode,
    qrCode: fibSub.qrCode,
    appLink: fibSub.appLink,
    validUntil: fibSub.validUntil,
  };
}

// ─── Get status ───────────────────────────────────────────────────────────────

export async function getFibStatus(
  userId: string,
  fibSubscriptionId: string,
): Promise<FibStatusResult> {
  const client = requireFib();

  const record = await prisma.fibSubscription.findUnique({
    where: { fibSubscriptionId },
  });
  if (!record || record.userId !== userId) {
    throw new AppError("Subscription not found", 404);
  }

  let details: Awaited<ReturnType<typeof client.getSubscription>>;
  try {
    details = await client.getSubscription(fibSubscriptionId);
  } catch (err) {
    if (err instanceof FibSubscribeError) throw new AppError(`FIB error: ${err.message}`, 502);
    throw err instanceof Error ? err : new Error(String(err));
  }

  const incomingStatus = details.status as FibSubStatusType;

  // Sync local record + main Subscription if status changed
  if (record.fibStatus !== incomingStatus) {
    const now = new Date();
    const isActivating = incomingStatus === "ACTIVE" || incomingStatus === "TRIAL";
    const isCancelling = incomingStatus === "CANCELLED" || incomingStatus === "REJECTED";

    await prisma.$transaction([
      prisma.fibSubscription.update({
        where: { id: record.id },
        data: {
          fibStatus: incomingStatus,
          ...(isActivating && !record.activatedAt ? { activatedAt: now } : {}),
          ...(isCancelling && !record.cancelledAt ? { cancelledAt: now } : {}),
        },
      }),
      isActivating
        ? prisma.subscription.update({
            where: { userId },
            data: {
              plan: record.plan,
              status: "ACTIVE",
              paymentProvider: "FIB",
              externalSubscriptionId: fibSubscriptionId,
              currentPeriodStart: now,
              currentPeriodEnd: details.activeUntil
                ? new Date(details.activeUntil)
                : null,
            },
          })
        : isCancelling
          ? prisma.subscription.update({
              where: { userId },
              data: {
                plan: "FREE",
                status: "ACTIVE",
                paymentProvider: null,
                externalSubscriptionId: null,
                currentPeriodEnd: now,
              },
            })
          : prisma.subscription.findUnique({ where: { userId } }), // no-op read
    ]);
  }

  return {
    fibStatus: incomingStatus,
    plan: record.plan as Extract<typeof record.plan, "GOLD" | "PREMIUM">,
    intervalMonths: record.intervalMonths,
    amountIQD: record.amountIQD,
    activeUntil: details.activeUntil ? new Date(details.activeUntil) : null,
    lastPaymentAt: details.lastPaymentAt ? new Date(details.lastPaymentAt) : null,
  };
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelFibSubscription(
  userId: string,
  fibSubscriptionId: string,
): Promise<void> {
  const client = requireFib();

  const record = await prisma.fibSubscription.findUnique({
    where: { fibSubscriptionId },
  });
  if (!record || record.userId !== userId) {
    throw new AppError("Subscription not found", 404);
  }
  if (record.fibStatus === "CANCELLED" || record.fibStatus === "REJECTED") {
    throw new AppError("Subscription is already cancelled", 409);
  }

  try {
    await client.cancelSubscription(fibSubscriptionId);
  } catch (err) {
    if (err instanceof FibSubscribeError) throw new AppError(`FIB error: ${err.message}`, 502);
    throw err instanceof Error ? err : new Error(String(err));
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.fibSubscription.update({
      where: { id: record.id },
      data: { fibStatus: "CANCELLED", cancelledAt: now },
    }),
    prisma.subscription.update({
      where: { userId },
      data: {
        plan: "FREE",
        status: "ACTIVE",
        paymentProvider: null,
        externalSubscriptionId: null,
        currentPeriodEnd: now,
      },
    }),
  ]);
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export async function handleFibWebhook(subscriptionId: string): Promise<void> {
  if (!fib) return; // FIB not configured — ignore

  const record = await prisma.fibSubscription.findUnique({
    where: { fibSubscriptionId: subscriptionId },
  });
  if (!record) return; // Unknown subscription — not ours

  // Always re-verify from FIB — never trust the webhook body alone
  let details: Awaited<ReturnType<typeof fib.getSubscription>>;
  try {
    details = await fib.getSubscription(subscriptionId);
  } catch {
    return; // FIB unreachable — skip; will reconcile on next poll or webhook retry
  }

  const incomingStatus = details.status as FibSubStatusType;
  if (record.fibStatus === incomingStatus) return; // Idempotency: already processed

  const now = new Date();
  const isActivating = incomingStatus === "ACTIVE" || incomingStatus === "TRIAL";
  const isCancelling = incomingStatus === "CANCELLED" || incomingStatus === "REJECTED";

  await prisma.$transaction([
    prisma.fibSubscription.update({
      where: { id: record.id },
      data: {
        fibStatus: incomingStatus,
        ...(isActivating && !record.activatedAt ? { activatedAt: now } : {}),
        ...(isCancelling && !record.cancelledAt ? { cancelledAt: now } : {}),
      },
    }),
    isActivating
      ? prisma.subscription.update({
          where: { userId: record.userId },
          data: {
            plan: record.plan,
            status: "ACTIVE",
            paymentProvider: "FIB",
            externalSubscriptionId: subscriptionId,
            currentPeriodStart: now,
            currentPeriodEnd: details.activeUntil
              ? new Date(details.activeUntil)
              : null,
          },
        })
      : isCancelling
        ? prisma.subscription.update({
            where: { userId: record.userId },
            data: {
              plan: "FREE",
              status: "ACTIVE",
              paymentProvider: null,
              externalSubscriptionId: null,
              currentPeriodEnd: now,
            },
          })
        : prisma.subscription.findUnique({ where: { userId: record.userId } }),
  ]);
}
