import { prisma } from "../config/database.ts";
import { logger } from "../config/index.ts";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function runStaleSessionCleanupJob(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);

  try {
    // durationSeconds left as null — we don't know when the user actually left
    const result = await prisma.conversationSession.updateMany({
      where: {
        endedAt: null,
        startedAt: { lt: cutoff },
      },
      data: { endedAt: new Date() },
    });

    logger.info(`[cron:stale-session-cleanup] Closed ${result.count} zombie session(s)`);
  } catch (err) {
    logger.error("[cron:stale-session-cleanup] Failed", { error: err });
  }
}
