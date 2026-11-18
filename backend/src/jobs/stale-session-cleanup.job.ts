import { prisma } from "../config/database.ts";
import { logger } from "../config/index.ts";
import { finalizeSession } from "../modules/sessions/sessions.service.ts";

// Most learners never press "End session". A chat with no message for 24 hours is closed
// here exactly as if they had, so its summary, new words and scores are not lost.
const IDLE_MS = 24 * 60 * 60 * 1000;
const BATCH = 200;

export async function runStaleSessionCleanupJob(): Promise<void> {
  const cutoff = new Date(Date.now() - IDLE_MS);
  try {
    const idle = await prisma.conversationSession.findMany({
      where: {
        endedAt: null,
        startedAt: { lt: cutoff },
        messages: { none: { createdAt: { gte: cutoff } } },
      },
      select: { id: true },
      orderBy: { startedAt: "asc" },
      take: BATCH,
    });
    let closed = 0;
    for (const { id } of idle) {
      try {
        await finalizeSession(id);
        closed++;
      } catch (err) {
        logger.warn("[cron:idle-chat-close] could not close a chat", { sessionId: id, error: (err as Error).message });
      }
    }
    logger.info(`[cron:idle-chat-close] Closed ${closed} chat(s) idle for 24h`);
  } catch (err) {
    logger.error("[cron:idle-chat-close] Failed", { error: err });
  }
}
