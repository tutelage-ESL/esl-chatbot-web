import { prisma } from "../config/database.ts";
import { logger } from "../config/index.ts";
import { learnerDay, safeTimezone, shiftDays } from "../utils/learnerDay.ts";

// A streak breaks when a learner misses a whole day of THEIR calendar. Runs hourly so every
// time zone gets its reset soon after its own midnight.
//
// The old job ran at 00:00 UTC and reset anyone whose last study day was before "today",
// which included everyone who studied yesterday: streaks could never pass 1.
export async function runStreakResetJob(): Promise<void> {
  try {
    const learners = await prisma.userMetrics.findMany({
      where: { currentStreak: { gt: 0 } },
      select: { userId: true, lastStudyDate: true, user: { select: { learnerProfile: { select: { timezone: true } } } } },
    });
    const now = new Date();
    const broken = learners
      .filter((m) => {
        const yesterday = shiftDays(learnerDay(safeTimezone(m.user.learnerProfile?.timezone), now), -1);
        return !m.lastStudyDate || m.lastStudyDate.getTime() < yesterday.getTime();
      })
      .map((m) => m.userId);
    if (broken.length) {
      await prisma.userMetrics.updateMany({ where: { userId: { in: broken } }, data: { currentStreak: 0 } });
    }
    logger.info(`[cron:streak-reset] Reset ${broken.length} streak(s)`);
  } catch (err) {
    logger.error("[cron:streak-reset] Failed", { error: err });
  }
}
