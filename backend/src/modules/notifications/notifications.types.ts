import type { NotificationType, Prisma } from "@prisma/client";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  data: Prisma.JsonValue | null;
  createdAt: Date;
}
