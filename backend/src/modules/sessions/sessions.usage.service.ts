import { prisma } from "../../config/database.ts";
import { secondsUntilNextDay } from "../../utils/retryAfter.ts";
import {
  FREE_MAX_SESSIONS_PER_DAY,
  GOLD_MAX_SESSIONS_PER_DAY,
  PREMIUM_MAX_SESSIONS_PER_DAY,
  FREE_MAX_MESSAGES_PER_DAY,
} from "./sessions.service.ts";
import type { SessionBlockReason, SessionUsageData } from "./sessions.types.ts";

const SESSIONS_PER_DAY = {
  FREE: FREE_MAX_SESSIONS_PER_DAY,
  GOLD: GOLD_MAX_SESSIONS_PER_DAY,
  PREMIUM: PREMIUM_MAX_SESSIONS_PER_DAY,
} as const;

// Today's usage against the same rules createSession / sendMessage enforce, so a page
// can show "locked" before the learner starts, instead of failing mid-conversation.
// Read-only: an expired paid plan counts as FREE here; createSession does the write.
export async function getSessionUsage(userId: string): Promise<SessionUsageData> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [subscription, sessionsToday, messagesToday] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId }, select: { status: true, plan: true, currentPeriodEnd: true } }),
    prisma.conversationSession.count({ where: { userId, startedAt: { gte: todayStart } } }),
    prisma.message.count({ where: { userId, role: "USER", createdAt: { gte: todayStart } } }),
  ]);

  const expired = !!subscription?.currentPeriodEnd && subscription.currentPeriodEnd < new Date();
  const plan = !subscription || expired ? "FREE" : subscription.plan;
  const active = subscription?.status === "ACTIVE";
  const sessionsPerDay = SESSIONS_PER_DAY[plan];
  const messagesPerDay = plan === "FREE" ? FREE_MAX_MESSAGES_PER_DAY : null;

  const reason: SessionBlockReason | null = !active
    ? "INACTIVE"
    : sessionsToday >= sessionsPerDay
      ? "SESSION_LIMIT"
      : messagesPerDay !== null && messagesToday >= messagesPerDay
        ? "MESSAGE_LIMIT"
        : null;

  return {
    plan,
    active,
    sessionsToday,
    sessionsPerDay,
    messagesToday,
    messagesPerDay,
    canStart: reason === null,
    reason,
    resetsInSeconds: secondsUntilNextDay(),
  };
}
