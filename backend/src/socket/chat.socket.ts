import type { Namespace } from "socket.io";
import { z } from "zod/v4";
import { prisma } from "../config/database.ts";
import { AppError } from "../utils/AppError.ts";
import { sendMessage } from "../modules/messages/messages.service.ts";
import {
  FREE_MAX_MESSAGES_PER_SESSION,
  GOLD_MAX_MESSAGES_PER_SESSION,
  PREMIUM_MAX_MESSAGES_PER_SESSION,
  SOFT_LIMIT_BUFFER,
} from "../modules/sessions/sessions.service.ts";
import type { AuthSocket } from "./index.ts";
import type { Plan } from "@prisma/client";

const sessionJoinSchema = z.object({ sessionId: z.string().uuid() });

const messageSendSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  clientMsgId: z.string().min(1).max(64),
});

// Tracks sessions currently processing a message — prevents double-sends
const inProgress = new Set<string>();

function softLimitWarning(
  userMessageCount: number,
  plan: Plan,
): { remaining: number; softLimit: number } | null {
  const softLimit =
    plan === "PREMIUM"
      ? PREMIUM_MAX_MESSAGES_PER_SESSION
      : plan === "GOLD"
        ? GOLD_MAX_MESSAGES_PER_SESSION
        : FREE_MAX_MESSAGES_PER_SESSION;

  if (userMessageCount >= softLimit) {
    const remaining = softLimit + SOFT_LIMIT_BUFFER - userMessageCount;
    return { remaining: Math.max(0, remaining), softLimit };
  }
  return null;
}

export function initChatHandlers(namespace: Namespace): void {
  namespace.on("connection", (socket: AuthSocket) => {
    const userId = socket.data.user.id;

    // ── session:join ──────────────────────────────────────────
    socket.on("session:join", async (data: unknown) => {
      const parsed = sessionJoinSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit("session:error", { message: "Invalid session ID" });
        return;
      }
      const { sessionId } = parsed.data;

      const session = await prisma.conversationSession.findUnique({
        where: { id: sessionId },
        select: { userId: true, endedAt: true },
      });

      if (!session || session.userId !== userId) {
        socket.emit("session:error", { message: "Session not found" });
        return;
      }

      if (session.endedAt) {
        socket.emit("session:error", { message: "Session has ended" });
        return;
      }

      await socket.join(`session:${sessionId}`);
      socket.emit("session:joined", { sessionId });
    });

    // ── session:leave ─────────────────────────────────────────
    socket.on("session:leave", async (data: unknown) => {
      const parsed = sessionJoinSchema.safeParse(data);
      if (!parsed.success) return;
      await socket.leave(`session:${parsed.data.sessionId}`);
    });

    // ── message:send ──────────────────────────────────────────
    socket.on("message:send", async (data: unknown) => {
      const parsed = messageSendSchema.safeParse(data);
      if (!parsed.success) {
        const clientMsgId = (data as Record<string, unknown>)?.clientMsgId ?? null;
        socket.emit("message:error", {
          clientMsgId,
          code: "VALIDATION_ERROR",
          message: "Invalid message data",
        });
        return;
      }

      const { sessionId, content, clientMsgId } = parsed.data;

      const lockKey = `${userId}:${sessionId}`;
      if (inProgress.has(lockKey)) {
        socket.emit("message:error", {
          clientMsgId,
          code: "PROCESSING",
          message: "Previous message is still processing. Please wait.",
        });
        return;
      }

      inProgress.add(lockKey);
      socket.emit("message:thinking", { sessionId, clientMsgId });

      try {
        const result = await sendMessage(userId, sessionId, content, "TEXT");

        const [subscription, userMessageCount] = await Promise.all([
          prisma.subscription.findUnique({ where: { userId }, select: { plan: true } }),
          prisma.message.count({ where: { sessionId, role: "USER" } }),
        ]);
        const plan = (subscription?.plan ?? "FREE") as Plan;

        socket.emit("message:response", {
          sessionId,
          clientMsgId,
          ...result,
          softLimitWarning: softLimitWarning(userMessageCount, plan),
        });
      } catch (err) {
        let code = "INTERNAL_ERROR";
        let message = "Failed to send message";

        if (err instanceof AppError) {
          message = err.message;
          if (err.statusCode === 404) code = "SESSION_NOT_FOUND";
          else if (err.statusCode === 409) code = "SESSION_ENDED";
          else if (err.statusCode === 429) {
            code = "LIMIT_REACHED";
            // Distinguish session vs daily cap by message content
            message = err.message;
          }
        }

        socket.emit("message:error", { clientMsgId, code, message });
      } finally {
        inProgress.delete(lockKey);
      }
    });

  });
}
