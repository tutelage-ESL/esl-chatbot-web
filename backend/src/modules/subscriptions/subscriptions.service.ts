import type { FibSubscription } from "@prisma/client";
import { FibSubscribeError } from "../../lib/fib-client.ts";
import type { SubscriptionDetails } from "../../lib/fib-client.ts";
import { prisma } from "../../config/database.ts";
import { fib } from "../../config/fib.ts";
import { AppError } from "../../utils/AppError.ts";
import { env } from "../../config/env.ts";
import { logger } from "../../config/index.ts";
import { deleteCache, cacheKeys } from "../../config/cache.ts";
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

// ─── Shared status-sync helper ────────────────────────────────────────────────
// Used by getFibStatus, handleFibWebhook, and the reconciliation cron job to
// avoid duplicating the status-transition + subscription-update transaction.
export async function applyFibStatusChange(
  record: FibSubscription,
  details: SubscriptionDetails,
): Promise<void> {
  const incomingStatus = details.status as FibSubStatusType;
  if (record.fibStatus === incomingStatus) return; // already up to date

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
            externalSubscriptionId: record.fibSubscriptionId,
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

  // Plan/status changed — the auth cache for this user is now stale
  if (isActivating || isCancelling) {
    await deleteCache(cacheKeys.authUser(record.userId));
  }
}

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

  // Guard 1: cross-provider conflicts — cannot layer FIB on top of another active provider
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

  // Guard 2: prevent multiple concurrent DRAFT FIB subscriptions for the same user.
  // A pending DRAFT means a QR code is already open and awaiting payment. Allowing
  // multiple DRAFTs would let a user accumulate several open payment requests,
  // each of which could independently activate and charge them.
  const pendingFib = await prisma.fibSubscription.findFirst({
    where: { userId, fibStatus: { notIn: ["CANCELLED", "REJECTED"] } },
    select: { id: true },
  });
  if (pendingFib) {
    throw new AppError(
      "You already have a pending FIB subscription. Cancel it or wait for it to expire before starting a new one.",
      409,
    );
  }

  const amountIQD = PLAN_AMOUNTS_IQD[plan]?.[intervalMonths];
  if (!amountIQD) throw new AppError("Invalid plan or interval combination", 400);

  // Create subscription at FIB. NOTE: FIB *requires* both `description` and
  // `statusCallbackUrl` — omitting either returns a generic 400 INVALID_REQUEST
  // (verified against the FIB stage API). In production set FIB_WEBHOOK_URL to a
  // public HTTPS endpoint; in local dev we fall back to a localhost URL (FIB accepts
  // it but can't reach it — activation is detected via polling on GET .../status).
  const statusCallbackUrl =
    env.FIB_WEBHOOK_URL ??
    `http://localhost:${env.PORT}/api/v1/subscriptions/webhook/fib`;
  let fibSub: Awaited<ReturnType<typeof client.createSubscription>>;
  try {
    fibSub = await client.createSubscription({
      title: `Tutelage ${plan}`,
      description: `${plan} English learning plan`,
      amount: amountIQD,
      currency: "IQD",
      interval: INTERVAL_ISO[intervalMonths]!,
      expiresIn: "P1DT12H",
      statusCallbackUrl,
    });
  } catch (err) {
    if (err instanceof FibSubscribeError) {
      logger.error("[fib] createSubscription error", { status: err.statusCode, message: err.message });
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

  await applyFibStatusChange(record, details);

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

  const now = new Date();

  // A DRAFT subscription was never paid, so it never activated the user's plan and
  // FIB has nothing to cancel — calling FIB's cancel on a DRAFT returns
  // ILLEGAL_SUBSCRIPTION_STATUS_TRANSITION (400). Just discard the local record;
  // the unpaid DRAFT expires on its own at FIB.
  if (record.fibStatus === "DRAFT") {
    await prisma.fibSubscription.update({
      where: { id: record.id },
      data: { fibStatus: "CANCELLED", cancelledAt: now },
    });
    return;
  }

  // ACTIVE/TRIAL — cancel at FIB, then downgrade the user's plan to FREE ACTIVE.
  try {
    await client.cancelSubscription(fibSubscriptionId);
  } catch (err) {
    if (err instanceof FibSubscribeError) throw new AppError(`FIB error: ${err.message}`, 502);
    throw err instanceof Error ? err : new Error(String(err));
  }

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
  await deleteCache(cacheKeys.authUser(userId));
}

// ─── Webhook ──────────────────────────────────────────────────────────────────
//
// Security note: FIB does not sign webhook payloads (no HMAC header), so we
// cannot verify the caller is FIB. Mitigation: we ALWAYS re-fetch from the FIB
// API before mutating any DB state — an attacker posting a spoofed callback
// cannot cause a state change that does not already exist in FIB's own records.
// TODO (hardening): once FIB discloses their static callback IP ranges,
// add an IP allowlist check here (FIB_WEBHOOK_IP_ALLOWLIST env var) so only
// FIB servers can trigger the re-verification call in the first place.

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

  // applyFibStatusChange is idempotent — it returns early if status is unchanged
  await applyFibStatusChange(record, details);
}
