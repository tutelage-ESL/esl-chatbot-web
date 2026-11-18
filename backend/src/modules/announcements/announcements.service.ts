import { randomUUID } from "node:crypto";
import { prisma } from "../../config/database.ts";
import { signedDownloadUrl } from "../../config/storage.ts";
import { AppError } from "../../utils/AppError.ts";
import { createNotification } from "../notifications/notifications.service.ts";
import { removeTaskFiles, storeTaskFiles, type UploadedFile } from "../tasks/tasks.files.ts";
import {
  assertAuthorOrAdmin,
  assertNotArchived,
  findAnnouncement,
  getClassAccess,
} from "./announcements.access.ts";
import type { AnnouncementAttachmentItem, AnnouncementItem } from "./announcements.types.ts";
import type { UpdateAnnouncementBody } from "./announcements.schema.ts";

// Access rules live in announcements.access.ts; comments in announcements.comments.service.ts.

const MAX_ANNOUNCEMENT_FILES = 10;

export const ANNOUNCEMENT_ATTACHMENT_SELECT = {
  id: true,
  fileName: true,
  fileUrl: true,
  mimeType: true,
  size: true,
  createdAt: true,
} as const;

const ANNOUNCEMENT_SELECT = {
  id: true,
  classId: true,
  authorId: true,
  content: true,
  commentsEnabled: true,
  editedAt: true,
  createdAt: true,
  author: { select: { id: true, displayName: true, avatarUrl: true } },
  attachments: { select: ANNOUNCEMENT_ATTACHMENT_SELECT, orderBy: { createdAt: "asc" } },
  _count: { select: { comments: true } },
} as const;

type RawAnnouncement = Omit<AnnouncementItem, "commentCount"> & { _count: { comments: number } };

function shape({ _count, ...rest }: RawAnnouncement): AnnouncementItem {
  return { ...rest, commentCount: _count.comments };
}

export async function listAnnouncements(
  classId: string,
  actorId: string,
  actorRole: string,
  page: number,
  limit: number,
): Promise<{ announcements: AnnouncementItem[]; total: number }> {
  await getClassAccess(classId, actorId, actorRole);
  const [raws, total] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: { classId },
      select: ANNOUNCEMENT_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.announcement.count({ where: { classId } }),
  ]);
  return { announcements: raws.map(shape), total };
}

export async function createAnnouncement(
  classId: string,
  actorId: string,
  actorRole: string,
  content: string,
  files: UploadedFile[] = [],
): Promise<AnnouncementItem> {
  const access = await getClassAccess(classId, actorId, actorRole);
  if (!access.canManage) throw new AppError("Only tutors can post announcements", 403);
  assertNotArchived(access);
  if (files.length > MAX_ANNOUNCEMENT_FILES) throw new AppError(`Attach up to ${MAX_ANNOUNCEMENT_FILES} files`, 422);

  // The id is chosen first so the files can be stored under it before the row exists.
  const id = randomUUID();
  const stored = await storeTaskFiles(id, files, "announcements");
  let raw: RawAnnouncement;
  try {
    raw = await prisma.announcement.create({
      data: {
        id,
        classId,
        authorId: actorId,
        content,
        attachments: { create: stored.map((s) => ({ ...s, uploadedById: actorId })) },
      },
      select: ANNOUNCEMENT_SELECT,
    });
  } catch (err) {
    await removeTaskFiles(stored.map((s) => s.fileUrl));
    throw err;
  }

  // Notify the class's students (internal stealth accounts excluded)
  const students = await prisma.classUser.findMany({
    where: { classId, role: "STUDENT", user: { isInternal: false } },
    select: { userId: true },
  });
  await Promise.all(
    students.map((s) =>
      createNotification(s.userId, "CLASS_ANNOUNCEMENT", `New announcement in ${access.className}`, { classId }),
    ),
  ).catch(() => {});

  return shape(raw);
}

/** Text: author or admin. Comments on/off: tutors of the class and admins. */
export async function updateAnnouncement(
  classId: string,
  announcementId: string,
  actorId: string,
  actorRole: string,
  body: UpdateAnnouncementBody,
): Promise<AnnouncementItem> {
  const access = await getClassAccess(classId, actorId, actorRole);
  assertNotArchived(access);
  const announcement = await findAnnouncement(classId, announcementId);
  if (body.content !== undefined) assertAuthorOrAdmin(access, announcement.authorId, actorId, "edit");
  if (body.commentsEnabled !== undefined && !access.canManage) {
    throw new AppError("Only tutors can turn comments on or off", 403);
  }

  const raw = await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      ...(body.content !== undefined && { content: body.content, editedAt: new Date() }),
      ...(body.commentsEnabled !== undefined && { commentsEnabled: body.commentsEnabled }),
    },
    select: ANNOUNCEMENT_SELECT,
  });
  return shape(raw);
}

/** Removes the announcement with its comments and files. Author or admin. */
export async function deleteAnnouncement(
  classId: string,
  announcementId: string,
  actorId: string,
  actorRole: string,
): Promise<void> {
  const access = await getClassAccess(classId, actorId, actorRole);
  assertNotArchived(access);
  const announcement = await findAnnouncement(classId, announcementId);
  assertAuthorOrAdmin(access, announcement.authorId, actorId, "delete");
  await prisma.announcement.delete({ where: { id: announcementId } });
  await removeTaskFiles(announcement.attachments.map((a) => a.fileUrl));
}

export async function addAnnouncementFiles(
  classId: string,
  announcementId: string,
  actorId: string,
  actorRole: string,
  files: UploadedFile[],
): Promise<AnnouncementAttachmentItem[]> {
  const access = await getClassAccess(classId, actorId, actorRole);
  assertNotArchived(access);
  const announcement = await findAnnouncement(classId, announcementId);
  assertAuthorOrAdmin(access, announcement.authorId, actorId, "add files to");
  if (!files.length) throw new AppError("Choose at least one file", 422);
  if (announcement.attachments.length + files.length > MAX_ANNOUNCEMENT_FILES) {
    throw new AppError(`An announcement can have up to ${MAX_ANNOUNCEMENT_FILES} files`, 422);
  }

  const stored = await storeTaskFiles(announcementId, files, "announcements");
  try {
    return await prisma.$transaction(
      stored.map((s) =>
        prisma.announcementAttachment.create({
          data: { ...s, announcementId, uploadedById: actorId },
          select: ANNOUNCEMENT_ATTACHMENT_SELECT,
        }),
      ),
    );
  } catch (err) {
    await removeTaskFiles(stored.map((s) => s.fileUrl));
    throw err;
  }
}

export async function deleteAnnouncementFile(
  classId: string,
  announcementId: string,
  attachmentId: string,
  actorId: string,
  actorRole: string,
): Promise<void> {
  const access = await getClassAccess(classId, actorId, actorRole);
  assertNotArchived(access);
  const announcement = await findAnnouncement(classId, announcementId);
  assertAuthorOrAdmin(access, announcement.authorId, actorId, "remove files from");
  const file = announcement.attachments.find((a) => a.id === attachmentId);
  if (!file) throw new AppError("File not found", 404);
  await prisma.announcementAttachment.delete({ where: { id: attachmentId } });
  await removeTaskFiles([file.fileUrl]);
}

/** A 5-minute download link; any class member or admin. */
export async function getAnnouncementFileDownload(
  classId: string,
  announcementId: string,
  attachmentId: string,
  actorId: string,
  actorRole: string,
): Promise<{ url: string; fileName: string }> {
  await getClassAccess(classId, actorId, actorRole);
  const file = await prisma.announcementAttachment.findFirst({
    where: { id: attachmentId, announcementId, announcement: { classId } },
    select: { fileUrl: true, fileName: true },
  });
  if (!file) throw new AppError("File not found", 404);
  return { url: await signedDownloadUrl(file.fileUrl, file.fileName), fileName: file.fileName };
}
