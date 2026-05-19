import type { NotificationType } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import type { NotificationItem } from "./notifications.types.ts";

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  message: true,
  read: true,
  createdAt: true,
} as const;

// ── Shared helper used by other services ──────────────────

export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
): Promise<void> {
  await prisma.notification.create({ data: { userId, type, message } });
}

// ── User-facing queries ───────────────────────────────────

export async function listNotifications(
  userId: string,
  page: number,
  limit: number,
  read?: boolean,
): Promise<{ notifications: NotificationItem[]; total: number }> {
  const skip = (page - 1) * limit;
  const where = { userId, ...(read !== undefined ? { read } : {}) };

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      select: NOTIFICATION_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
