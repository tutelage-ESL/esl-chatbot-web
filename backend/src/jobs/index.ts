import { Cron } from "croner";
import { logger } from "../config/index.ts";
import { runStreakResetJob } from "./streak-reset.job.ts";
import { runSubscriptionExpiryJob } from "./subscription-expiry.job.ts";
import { runStaleSessionCleanupJob } from "./stale-session-cleanup.job.ts";

const jobs: Cron[] = [];

export function startCronJobs(): void {
  // 00:00 UTC — reset streaks for users who didn't study today
  jobs.push(new Cron("0 0 * * *", { timezone: "UTC" }, runStreakResetJob));

  // 01:00 UTC — enforce subscription expiry (proactive, mirrors lazy-downgrade at session start)
  jobs.push(new Cron("0 1 * * *", { timezone: "UTC" }, runSubscriptionExpiryJob));

  // 02:00 UTC — close sessions open longer than 24 hours (zombie/abandoned sessions)
  jobs.push(new Cron("0 2 * * *", { timezone: "UTC" }, runStaleSessionCleanupJob));

  logger.info("[cron] 3 jobs scheduled (streak-reset@00:00, subscription-expiry@01:00, stale-session-cleanup@02:00 UTC)");
}

export function stopCronJobs(): void {
  for (const job of jobs) {
    job.stop();
  }
  jobs.length = 0;
  logger.info("[cron] All jobs stopped");
}
