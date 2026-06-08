import { Cron } from "croner";
import { logger, Sentry } from "../config/index.ts";
import { runStreakResetJob } from "./streak-reset.job.ts";
import { runSubscriptionExpiryJob } from "./subscription-expiry.job.ts";
import { runStaleSessionCleanupJob } from "./stale-session-cleanup.job.ts";
import { runFibReconcileJob } from "./fib-reconcile.job.ts";
import { runWeeklyDigestJob } from "./weekly-digest.job.ts";

const jobs: Cron[] = [];

// Wraps a cron job so any error that escapes its internal try/catch is captured
// in Sentry rather than silently disappearing. Each job still logs internally via Winston.
function safeRun(name: string, fn: () => Promise<void>): () => void {
  return () => {
    fn().catch((err) => {
      logger.error(`[cron:${name}] Unhandled error`, { error: err });
      Sentry.withScope((scope) => {
        scope.setTag("job", name);
        Sentry.captureException(err);
      });
    });
  };
}

export function startCronJobs(): void {
  // 00:00 UTC — reset streaks for users who didn't study today
  jobs.push(new Cron("0 0 * * *", { timezone: "UTC" }, safeRun("streak-reset", runStreakResetJob)));

  // 01:00 UTC — enforce subscription expiry (proactive, mirrors lazy-downgrade at session start)
  jobs.push(new Cron("0 1 * * *", { timezone: "UTC" }, safeRun("subscription-expiry", runSubscriptionExpiryJob)));

  // 02:00 UTC — close sessions open longer than 24 hours (zombie/abandoned sessions)
  jobs.push(new Cron("0 2 * * *", { timezone: "UTC" }, safeRun("stale-session-cleanup", runStaleSessionCleanupJob)));

  // Every 15 min — reconcile pending FIB subscriptions against FIB API (safety net for missed webhooks)
  jobs.push(new Cron("*/15 * * * *", { timezone: "UTC" }, safeRun("fib-reconcile", runFibReconcileJob)));

  // Monday 08:00 UTC — send weekly progress digest to all active verified students
  jobs.push(new Cron("0 8 * * 1", { timezone: "UTC" }, safeRun("weekly-digest", runWeeklyDigestJob)));

  logger.info("[cron] 5 jobs scheduled (streak-reset@00:00, subscription-expiry@01:00, stale-session-cleanup@02:00 UTC, fib-reconcile@*/15min, weekly-digest@Mon08:00)");
}

export function stopCronJobs(): void {
  for (const job of jobs) {
    job.stop();
  }
  jobs.length = 0;
  logger.info("[cron] All jobs stopped");
}
