import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import { ATTACHMENT_SELECT, getTaskAccess } from "./tasks.service.ts";
import { removeTaskFiles, storeTaskFiles, type UploadedFile } from "./tasks.files.ts";
import type { ClassActorRole, TaskAttachmentItem, TaskCommentItem } from "./tasks.types.ts";

// Access model:
//   read    — any class member or admin (the whole class sees every comment)
//   write   — any member; students only while the tutor has comments switched on;
//             nobody writes in an archived class
//   edit    — the author only (text, add files, remove own files)
//   delete  — the author, a tutor of the class, or an admin

const MAX_FILES_PER_COMMENT = 5;

const COMMENT_SELECT = {
  id: true,
  taskId: true,
  authorId: true,
  content: true,
  editedAt: true,
  createdAt: true,
  author: { select: { id: true, displayName: true, avatarUrl: true } },
  attachments: { select: ATTACHMENT_SELECT, orderBy: { createdAt: "asc" } },
} as const;

type RawComment = {
  id: string;
  taskId: string;
  authorId: string;
  content: string | null;
  editedAt: Date | null;
  createdAt: Date;
  author: { id: string; displayName: string; avatarUrl: string | null };
  attachments: TaskAttachmentItem[];
};

type TaskAccess = Awaited<ReturnType<typeof getTaskAccess>>;

/** Attaches each author's role in the class (one query for the whole page). */
async function shapeComments(classId: string, raws: RawComment[]): Promise<TaskCommentItem[]> {
  const authorIds = [...new Set(raws.map((c) => c.authorId))];
  const members = authorIds.length
    ? await prisma.classUser.findMany({
        where: { classId, userId: { in: authorIds } },
        select: { userId: true, role: true },
      })
    : [];
  const roles = new Map(members.map((m) => [m.userId, m.role as ClassActorRole]));
  return raws.map((c) => ({
    id: c.id,
    taskId: c.taskId,
    content: c.content,
    editedAt: c.editedAt,
    author: { ...c.author, classRole: roles.get(c.authorId) ?? "ADMIN" },
    attachments: c.attachments,
    createdAt: c.createdAt,
  }));
}

function assertWritable(access: TaskAccess) {
  if (access.archived) throw new AppError("This class is archived", 409);
  if (!access.commentsEnabled && !access.canManage) {
    throw new AppError("Comments are turned off for this task", 403);
  }
}

function cleanContent(content: string | undefined): string | null {
  const t = content?.trim();
  return t ? t : null;
}

export async function listComments(
  taskId: string,
  actorId: string,
  actorRole: string,
  page: number,
  limit: number,
): Promise<{ comments: TaskCommentItem[]; total: number }> {
  const access = await getTaskAccess(taskId, actorId, actorRole);
  const [raws, total] = await prisma.$transaction([
    prisma.taskComment.findMany({
      where: { taskId },
      select: COMMENT_SELECT,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.taskComment.count({ where: { taskId } }),
  ]);
  return { comments: await shapeComments(access.classId, raws), total };
}

export async function createComment(
  taskId: string,
  actorId: string,
  actorRole: string,
  content: string | undefined,
  files: UploadedFile[],
): Promise<TaskCommentItem> {
  const access = await getTaskAccess(taskId, actorId, actorRole);
  assertWritable(access);

  const text = cleanContent(content);
  if (!text && !files.length) throw new AppError("Write a comment or attach a file", 422);
  if (files.length > MAX_FILES_PER_COMMENT) throw new AppError(`Attach up to ${MAX_FILES_PER_COMMENT} files`, 422);

  const stored = await storeTaskFiles(taskId, files);
  try {
    const raw = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: actorId,
        content: text,
        attachments: { create: stored.map((s) => ({ ...s, taskId, uploadedById: actorId })) },
      },
      select: COMMENT_SELECT,
    });
    return (await shapeComments(access.classId, [raw]))[0]!;
  } catch (err) {
    await removeTaskFiles(stored.map((s) => s.fileUrl));
    throw err;
  }
}

export async function updateComment(
  taskId: string,
  commentId: string,
  actorId: string,
  actorRole: string,
  body: { content?: string; removeAttachmentIds?: string[] },
  files: UploadedFile[],
): Promise<TaskCommentItem> {
  const access = await getTaskAccess(taskId, actorId, actorRole);
  assertWritable(access);

  const existing = await prisma.taskComment.findFirst({
    where: { id: commentId, taskId },
    select: { authorId: true, content: true, attachments: { select: { id: true, fileUrl: true } } },
  });
  if (!existing) throw new AppError("Comment not found", 404);
  if (existing.authorId !== actorId) throw new AppError("You can only edit your own comments", 403);

  const removeIds = new Set(body.removeAttachmentIds ?? []);
  const removed = existing.attachments.filter((a) => removeIds.has(a.id));
  const keptCount = existing.attachments.length - removed.length;
  const text = body.content !== undefined ? cleanContent(body.content) : existing.content;

  if (keptCount + files.length > MAX_FILES_PER_COMMENT) {
    throw new AppError(`A comment can have up to ${MAX_FILES_PER_COMMENT} files`, 422);
  }
  if (!text && keptCount + files.length === 0) {
    throw new AppError("A comment needs text or a file. Delete it instead.", 422);
  }

  const stored = await storeTaskFiles(taskId, files);
  let raw: RawComment;
  try {
    raw = await prisma.taskComment.update({
      where: { id: commentId },
      data: {
        content: text,
        editedAt: new Date(),
        attachments: {
          // Only ids that belong to this comment are in `removed`
          deleteMany: { id: { in: removed.map((a) => a.id) } },
          create: stored.map((s) => ({ ...s, taskId, uploadedById: actorId })),
        },
      },
      select: COMMENT_SELECT,
    });
  } catch (err) {
    await removeTaskFiles(stored.map((s) => s.fileUrl));
    throw err;
  }
  await removeTaskFiles(removed.map((a) => a.fileUrl));
  return (await shapeComments(access.classId, [raw]))[0]!;
}

export async function deleteComment(
  taskId: string,
  commentId: string,
  actorId: string,
  actorRole: string,
): Promise<void> {
  const access = await getTaskAccess(taskId, actorId, actorRole);
  const existing = await prisma.taskComment.findFirst({
    where: { id: commentId, taskId },
    select: { authorId: true, attachments: { select: { fileUrl: true } } },
  });
  if (!existing) throw new AppError("Comment not found", 404);
  if (existing.authorId !== actorId && !access.canManage) {
    throw new AppError("You can only delete your own comments", 403);
  }
  await prisma.taskComment.delete({ where: { id: commentId } });
  await removeTaskFiles(existing.attachments.map((a) => a.fileUrl));
}
