import type { NotificationType } from "@prisma/client";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
}
