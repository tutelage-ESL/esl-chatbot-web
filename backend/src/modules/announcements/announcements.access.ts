import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";

// Who may do what with a class's announcements:
//   read                — any class member or admin
//   post                — tutors of the class and admins
//   edit / delete / files — the announcement's author, or an admin
//   comments on/off     — tutors of the class and admins
//   comment             — any member; students only while comments are on
//   edit a comment      — its author only
//   delete a comment    — its author, a tutor of the class, or an admin
//   nothing new is written in an archived class

export type ClassAccess = {
  className: string;
  archived: boolean;
  isAdmin: boolean;
  /** Tutor of this class, or admin */
  canManage: boolean;
};

/** 404 for non-members (and for a class that doesn't exist), like the rest of the class API. */
export async function getClassAccess(classId: string, actorId: string, actorRole: string): Promise<ClassAccess> {
  const isAdmin = actorRole === "ADMIN";
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      className: true,
      archived: true,
      users: { where: { userId: actorId }, select: { role: true } },
    },
  });
  const membership = cls?.users[0];
  if (!cls || (!membership && !isAdmin)) throw new AppError("Class not found", 404);
  return {
    className: cls.className,
    archived: cls.archived,
    isAdmin,
    canManage: isAdmin || membership?.role === "TUTOR",
  };
}

export function assertNotArchived(access: ClassAccess) {
  if (access.archived) throw new AppError("This class is archived", 409);
}

/** The announcement, only if it belongs to this class. */
export async function findAnnouncement(classId: string, announcementId: string) {
  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, classId },
    select: { id: true, authorId: true, commentsEnabled: true, attachments: { select: { id: true, fileUrl: true } } },
  });
  if (!announcement) throw new AppError("Announcement not found", 404);
  return announcement;
}

export function assertAuthorOrAdmin(access: ClassAccess, authorId: string, actorId: string, action: string) {
  if (authorId !== actorId && !access.isAdmin) {
    throw new AppError(`Only the author can ${action} this announcement`, 403);
  }
}
