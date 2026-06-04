import { prisma } from "../config/database.ts";
import { fib } from "../config/fib.ts";
import { logger } from "../config/index.ts";
import { applyFibStatusChange } from "../modules/subscriptions/subscriptions.service.ts";

// Reconcile non-terminal FIB subscriptions against the FIB API.
// Safety net for missed webhooks — e.g. server was down when FIB posted the callback.
// Runs every 15 minutes; no-op when FIB credentials are not configured.
export async function runFibReconcileJob(): Promise<void> {
  if (!fib) return;

  const now = new Date();

  // Only DRAFT subscriptions that haven't expired yet — TRIAL/ACTIVE are handled
  // by the webhook or by the daily expiry job; we focus on the common case of a
  // user who paid but the webhook missed the DRAFT → ACTIVE transition.
  const pending = await prisma.fibSubscription.findMany({
    where: {
      fibStatus: "DRAFT",
      validUntil: { gt: now },
    },
  });

  if (pending.length === 0) return;

  logger.info(`[cron:fib-reconcile] Checking ${pending.length} pending FIB subscription(s)`);

  let synced = 0;
  for (const record of pending) {
    try {
      const details = await fib.getSubscription(record.fibSubscriptionId);
      await applyFibStatusChange(record, details);
      if (details.status !== record.fibStatus) synced++;
    } catch (err) {
      logger.error("[cron:fib-reconcile] Failed to reconcile subscription", {
        fibSubscriptionId: record.fibSubscriptionId,
        error: err,
      });
    }
  }

  if (synced > 0) {
    logger.info(`[cron:fib-reconcile] Synced ${synced} subscription(s)`);
  }
}
