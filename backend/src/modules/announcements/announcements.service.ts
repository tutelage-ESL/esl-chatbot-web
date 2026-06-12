import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import { createNotification } from "../notifications/notifications.service.ts";
import type { AnnouncementItem } from "./announcements.types.ts";

const ANNOUNCEMENT_SELECT = {
  id: true,
  classId: true,
  authorId: true,
  content: true,
  createdAt: true,
  author: {
    select: { id: true, displayName: true, avatarUrl: true },
  },
} as const;

export async function listAnnouncements(
  classId: string,
  actorUserId: string,
  actorRole: string,
  page: number,
  limit: number,
): Promise<{ announcements: AnnouncementItem[]; total: number }> {
  // Access: any class member or admin
  if (actorRole !== "ADMIN") {
    const membership = await prisma.classUser.findUnique({
      where: { classId_userId: { classId, userId: actorUserId } },
      select: { id: true },
    });
    if (!membership) throw new AppError("Class not found", 404);
  } else {
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
    if (!cls) throw new AppError("Class not found", 404);
  }

  const skip = (page - 1) * limit;

  const [announcements, total] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: { classId },
      select: ANNOUNCEMENT_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.announcement.count({ where: { classId } }),
  ]);

  return { announcements: announcements as AnnouncementItem[], total };
}

export async function createAnnouncement(
  classId: string,
  actorUserId: string,
  actorRole: string,
  content: string,
): Promise<AnnouncementItem> {
  // Only tutors of the class or admins can post
  let className = "your class";
  if (actorRole !== "ADMIN") {
    const membership = await prisma.classUser.findUnique({
      where: { classId_userId: { classId, userId: actorUserId } },
      select: { role: true, class: { select: { className: true } } },
    });
    if (!membership) throw new AppError("Class not found", 404);
    if (membership.role !== "TUTOR") {
      throw new AppError("Only tutors can post announcements", 403);
    }
    className = membership.class.className;
  } else {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { className: true },
    });
    if (!cls) throw new AppError("Class not found", 404);
    className = cls.className;
  }

  const announcement = await prisma.announcement.create({
    data: { classId, authorId: actorUserId, content },
    select: ANNOUNCEMENT_SELECT,
  });

  // Notify all student members of the class (internal stealth accounts excluded)
  const students = await prisma.classUser.findMany({
    where: { classId, role: "STUDENT", user: { isInternal: false } },
    select: { userId: true },
  });

  await Promise.all(
    students.map((s) =>
      createNotification(s.userId, "CLASS_ANNOUNCEMENT", `New announcement in ${className}`, { classId }),
    ),
  ).catch(() => {});

  return announcement as AnnouncementItem;
}
