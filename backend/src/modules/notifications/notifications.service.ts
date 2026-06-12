import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { getIO } from "../../socket/io-instance.ts";
import { AppError } from "../../utils/AppError.ts";
import type { NotificationItem } from "./notifications.types.ts";

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  message: true,
  read: true,
  data: true,
  createdAt: true,
} as const;

// ── Shared helper used by other services ──────────────────

export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  data?: Prisma.InputJsonValue,
): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId, type, message, ...(data !== undefined ? { data } : {}) },
    select: NOTIFICATION_SELECT,
  });

  // Push to connected client — silent no-op if socket server not running (tests, early startup)
  try {
    getIO().of("/notifications").to(`user:${userId}`).emit("notification:new", notification);
  } catch {
    // socket not initialized
  }
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

export async function markOneRead(userId: string, notificationId: string): Promise<NotificationItem> {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true },
  });

  if (!existing) throw new AppError("Notification not found", 404);

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
    select: NOTIFICATION_SELECT,
  });
}
