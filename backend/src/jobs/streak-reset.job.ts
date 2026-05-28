import { prisma } from "../config/database.ts";
import { logger } from "../config/index.ts";

export async function runStreakResetJob(): Promise<void> {
  // Use UTC midnight — matches the job's UTC schedule and avoids local-timezone drift
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  try {
    const result = await prisma.userMetrics.updateMany({
      where: {
        currentStreak: { gt: 0 },
        OR: [
          { lastStudyDate: null },
          { lastStudyDate: { lt: startOfToday } },
        ],
      },
      data: { currentStreak: 0 },
    });

    logger.info(`[cron:streak-reset] Reset streaks for ${result.count} user(s)`);
  } catch (err) {
    logger.error("[cron:streak-reset] Failed", { error: err });
  }
}
