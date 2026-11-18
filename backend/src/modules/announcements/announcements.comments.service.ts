import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import { logger } from "../../config/index.ts";
import { createNotification } from "../notifications/notifications.service.ts";
import { assertNotArchived, findAnnouncement, getClassAccess, type ClassAccess } from "./announcements.access.ts";
import type { AnnouncementCommentItem } from "./announcements.types.ts";

// Text-only class comments under an announcement. Rules: announcements.access.ts.

const COMMENT_SELECT = {
  id: true,
  announcementId: true,
  authorId: true,
  content: true,
  editedAt: true,
  createdAt: true,
  author: { select: { id: true, displayName: true, avatarUrl: true } },
} as const;

type RawComment = {
  id: string;
  announcementId: string;
  authorId: string;
  content: string;
  editedAt: Date | null;
  createdAt: Date;
  author: { id: string; displayName: string; avatarUrl: string | null };
};

/** Adds each author's role in the class (one query per page). */
async function shapeComments(classId: string, raws: RawComment[]): Promise<AnnouncementCommentItem[]> {
  const authorIds = [...new Set(raws.map((c) => c.authorId))];
  const members = authorIds.length
    ? await prisma.classUser.findMany({ where: { classId, userId: { in: authorIds } }, select: { userId: true, role: true } })
    : [];
  const roles = new Map(members.map((m) => [m.userId, m.role as "TUTOR" | "STUDENT"]));
  return raws.map(({ authorId, ...c }) => ({ ...c, author: { ...c.author, classRole: roles.get(authorId) ?? "ADMIN" } }));
}

function assertCanWrite(access: ClassAccess, commentsEnabled: boolean) {
  assertNotArchived(access);
  if (!commentsEnabled && !access.canManage) throw new AppError("Comments are turned off for this announcement", 403);
}

async function findComment(announcementId: string, commentId: string) {
  const comment = await prisma.announcementComment.findFirst({
    where: { id: commentId, announcementId },
    select: { authorId: true },
  });
  if (!comment) throw new AppError("Comment not found", 404);
  return comment;
}

export async function listAnnouncementComments(
  classId: string,
  announcementId: string,
  actorId: string,
  actorRole: string,
  page: number,
  limit: number,
): Promise<{ comments: AnnouncementCommentItem[]; total: number }> {
  await getClassAccess(classId, actorId, actorRole);
  await findAnnouncement(classId, announcementId);
  const [raws, total] = await prisma.$transaction([
    prisma.announcementComment.findMany({
      where: { announcementId },
      select: COMMENT_SELECT,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.announcementComment.count({ where: { announcementId } }),
  ]);
  return { comments: await shapeComments(classId, raws), total };
}

export async function createAnnouncementComment(
  classId: string,
  announcementId: string,
  actorId: string,
  actorRole: string,
  content: string,
): Promise<AnnouncementCommentItem> {
  const access = await getClassAccess(classId, actorId, actorRole);
  const announcement = await findAnnouncement(classId, announcementId);
  assertCanWrite(access, announcement.commentsEnabled);

  const raw = await prisma.announcementComment.create({
    data: { announcementId, authorId: actorId, content },
    select: COMMENT_SELECT,
  });
  notifyThread(classId, access.className, announcementId, announcement.authorId, raw).catch((err) =>
    logger.warn("[announcements] comment notifications failed", { announcementId, error: err?.message }),
  );
  return (await shapeComments(classId, [raw]))[0]!;
}

/** The announcement's author plus everyone who already commented, never the commenter. */
async function notifyThread(classId: string, className: string, announcementId: string, authorId: string, comment: RawComment) {
  const earlier = await prisma.announcementComment.findMany({
    where: { announcementId, id: { not: comment.id } },
    select: { authorId: true },
    distinct: ["authorId"],
  });
  const recipients = new Set([authorId, ...earlier.map((c) => c.authorId)]);
  recipients.delete(comment.authorId);
  const message = `${comment.author.displayName} commented on an announcement in ${className}`;
  await Promise.all(
    [...recipients].map((userId) => createNotification(userId, "ANNOUNCEMENT_COMMENT", message, { classId, announcementId })),
  );
}

export async function updateAnnouncementComment(
  classId: string,
  announcementId: string,
  commentId: string,
  actorId: string,
  actorRole: string,
  content: string,
): Promise<AnnouncementCommentItem> {
  const access = await getClassAccess(classId, actorId, actorRole);
  const announcement = await findAnnouncement(classId, announcementId);
  assertCanWrite(access, announcement.commentsEnabled);
  const comment = await findComment(announcementId, commentId);
  if (comment.authorId !== actorId) throw new AppError("You can only edit your own comments", 403);

  const raw = await prisma.announcementComment.update({
    where: { id: commentId },
    data: { content, editedAt: new Date() },
    select: COMMENT_SELECT,
  });
  return (await shapeComments(classId, [raw]))[0]!;
}

export async function deleteAnnouncementComment(
  classId: string,
  announcementId: string,
  commentId: string,
  actorId: string,
  actorRole: string,
): Promise<void> {
  const access = await getClassAccess(classId, actorId, actorRole);
  await findAnnouncement(classId, announcementId);
  const comment = await findComment(announcementId, commentId);
  if (comment.authorId !== actorId && !access.canManage) throw new AppError("You can only delete your own comments", 403);
  await prisma.announcementComment.delete({ where: { id: commentId } });
}
