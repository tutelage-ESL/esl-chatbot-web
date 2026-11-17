import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import { ATTACHMENT_SELECT, getTaskAccess } from "./tasks.service.ts";
import { removeTaskFiles, storeTaskFiles, type UploadedFile } from "./tasks.files.ts";
import { signedDownloadUrl } from "../../config/storage.ts";
import type { TaskAttachmentItem } from "./tasks.types.ts";

// Files on the task itself (handouts, worksheets): tutors of the class and admins only.
// Students attach files through comments instead (tasks.comments.service.ts).

const MAX_TASK_ATTACHMENTS = 10;

async function assertCanManage(taskId: string, actorId: string, actorRole: string) {
  const access = await getTaskAccess(taskId, actorId, actorRole);
  if (!access.canManage) throw new AppError("Only tutors can manage task files", 403);
  return access;
}

export async function addTaskAttachments(
  taskId: string,
  actorId: string,
  actorRole: string,
  files: UploadedFile[],
): Promise<TaskAttachmentItem[]> {
  const access = await assertCanManage(taskId, actorId, actorRole);
  if (access.archived) throw new AppError("This class is archived", 409);
  if (!files.length) throw new AppError("Choose at least one file", 422);

  const current = await prisma.taskAttachment.count({ where: { taskId, commentId: null, submissionId: null } });
  if (current + files.length > MAX_TASK_ATTACHMENTS) {
    throw new AppError(`A task can have up to ${MAX_TASK_ATTACHMENTS} files`, 422);
  }

  const stored = await storeTaskFiles(taskId, files);
  try {
    return await prisma.$transaction(
      stored.map((s) =>
        prisma.taskAttachment.create({
          data: { ...s, taskId, uploadedById: actorId },
          select: ATTACHMENT_SELECT,
        }),
      ),
    );
  } catch (err) {
    await removeTaskFiles(stored.map((s) => s.fileUrl));
    throw err;
  }
}

export async function deleteTaskAttachment(
  taskId: string,
  attachmentId: string,
  actorId: string,
  actorRole: string,
): Promise<void> {
  await assertCanManage(taskId, actorId, actorRole);
  // Comment files are removed through their comment, never here
  const attachment = await prisma.taskAttachment.findFirst({
    where: { id: attachmentId, taskId, commentId: null, submissionId: null },
    select: { fileUrl: true },
  });
  if (!attachment) throw new AppError("File not found", 404);
  await prisma.taskAttachment.delete({ where: { id: attachmentId } });
  await removeTaskFiles([attachment.fileUrl]);
}

/**
 * Task and comment files: any class member (or admin). Hand-in files: only the student
 * who handed in and the class's tutors/admins (404 for everyone else, like a missing file).
 */
export async function getTaskFileDownload(
  taskId: string,
  attachmentId: string,
  actorId: string,
  actorRole: string,
): Promise<{ url: string; fileName: string }> {
  const access = await getTaskAccess(taskId, actorId, actorRole);
  const attachment = await prisma.taskAttachment.findFirst({
    where: { id: attachmentId, taskId },
    select: { fileUrl: true, fileName: true, submission: { select: { studentId: true } } },
  });
  if (!attachment) throw new AppError("File not found", 404);
  if (attachment.submission && !access.canManage && attachment.submission.studentId !== actorId) {
    throw new AppError("File not found", 404);
  }
  return { url: await signedDownloadUrl(attachment.fileUrl, attachment.fileName), fileName: attachment.fileName };
}
