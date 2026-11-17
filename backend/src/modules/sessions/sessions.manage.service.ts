import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import type { SessionListItem } from "./sessions.types.ts";
import type { UpdateSessionBody } from "./sessions.schema.ts";

// Managing the learner's own chat list: rename, pin, delete. Split out of
// sessions.service.ts, which is about running a session.

const LIST_SELECT = {
  id: true,
  mode: true,
  topic: true,
  title: true,
  isPinned: true,
  summary: true,
  startedAt: true,
  endedAt: true,
  durationSeconds: true,
  messageCount: true,
  createdAt: true,
} as const;

/** Only the owner, and never a chat they already deleted (it is gone for them). */
async function assertOwnVisible(sessionId: string, userId: string): Promise<void> {
  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, deletedAt: true },
  });
  if (!session || session.userId !== userId || session.deletedAt) {
    throw new AppError("Session not found", 404);
  }
}

export async function updateSession(
  sessionId: string,
  userId: string,
  body: UpdateSessionBody,
): Promise<SessionListItem> {
  await assertOwnVisible(sessionId, userId);
  return prisma.conversationSession.update({
    where: { id: sessionId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.isPinned !== undefined && { isPinned: body.isPinned }),
    },
    select: LIST_SELECT,
  });
}

/**
 * "Delete" hides the chat from the learner for good. The row stays: it still
 * counts toward the daily session/message limits (so deleting can't reset a
 * quota) and stays in tutor/admin stats and progress history.
 */
export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  await assertOwnVisible(sessionId, userId);
  await prisma.conversationSession.update({
    where: { id: sessionId },
    data: { deletedAt: new Date(), isPinned: false },
  });
}
