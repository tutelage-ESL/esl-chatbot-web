import type { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import { taskFilesUpload, MAX_TASK_FILES } from "../../middlewares/upload.ts";
import { taskUploadLimiter } from "../../middlewares/rateLimits.ts";
import {
  listCommentsHandler,
  createCommentHandler,
  updateCommentHandler,
  deleteCommentHandler,
  addTaskAttachmentsHandler,
  deleteTaskAttachmentHandler,
  downloadTaskFileHandler,
} from "./tasks.comments.controller.ts";

/**
 * @swagger
 * components:
 *   schemas:
 *     TaskAttachmentItem:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         taskId: { type: string, format: uuid }
 *         commentId: { type: string, format: uuid, nullable: true, description: "Set when the file belongs to a comment" }
 *         submissionId: { type: string, format: uuid, nullable: true, description: "Set when the file was handed in with a submission (private)" }
 *         uploadedById: { type: string, format: uuid }
 *         fileName: { type: string, example: "worksheet.pdf" }
 *         fileUrl: { type: string, example: "https://pub-xxxx.r2.dev/tasks/task-id/uuid.pdf" }
 *         mimeType: { type: string, example: "application/pdf" }
 *         size: { type: integer, description: Bytes }
 *         createdAt: { type: string, format: date-time }
 *     TaskCommentItem:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         taskId: { type: string, format: uuid }
 *         content: { type: string, nullable: true, description: "null when the comment is only files" }
 *         editedAt: { type: string, format: date-time, nullable: true }
 *         author:
 *           type: object
 *           properties:
 *             id: { type: string, format: uuid }
 *             displayName: { type: string }
 *             avatarUrl: { type: string, nullable: true }
 *             classRole: { type: string, enum: [TUTOR, STUDENT, ADMIN], description: "Author's role in this class; ADMIN when an admin (not a member) wrote it" }
 *         attachments:
 *           type: array
 *           items: { $ref: '#/components/schemas/TaskAttachmentItem' }
 *         createdAt: { type: string, format: date-time }
 *     TaskFilesUpload:
 *       type: object
 *       properties:
 *         files:
 *           type: array
 *           maxItems: 5
 *           description: "Up to 5 files, 15 MB each: PDF, Word, PowerPoint, Excel, text, image (jpeg/png/webp/gif), audio (mp3/m4a/wav/webm/ogg) or video (mp4/webm/mov)"
 *           items: { type: string, format: binary }
 */

/**
 * @swagger
 * /tasks/{id}/comments:
 *   get:
 *     summary: List a task's class comments, oldest first
 *     description: Any class member or admin. The whole class sees every comment.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100, default: 100 } }
 *     responses:
 *       200:
 *         description: Comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/TaskCommentItem' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task not found or caller not in the class, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   post:
 *     summary: Post a comment, with optional files
 *     description: |
 *       Any class member or admin. Students can only comment while the tutor has comments
 *       switched on (`commentsEnabled`). Needs text, files, or both.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/TaskFilesUpload'
 *               - type: object
 *                 properties:
 *                   content: { type: string, maxLength: 2000 }
 *     responses:
 *       201:
 *         description: Comment posted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/TaskCommentItem' }
 *       400: { description: File type not allowed or too many files, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Comments are turned off (students), content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task not found or caller not in the class, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Class is archived, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       413: { description: A file is over 15 MB, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: No text and no files, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */

/**
 * @swagger
 * /tasks/{id}/comments/{commentId}:
 *   patch:
 *     summary: Edit your own comment (text, add files, remove files)
 *     description: Author only. Students cannot edit while comments are turned off.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: commentId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/TaskFilesUpload'
 *               - type: object
 *                 properties:
 *                   content: { type: string, maxLength: 2000, description: "Omit to keep the text; empty clears it" }
 *                   removeAttachmentIds: { type: string, description: "Comma-separated ids of this comment's files to remove" }
 *     responses:
 *       200:
 *         description: Comment updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/TaskCommentItem' }
 *       403: { description: Not the author, or comments are turned off, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task or comment not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Class is archived, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Would leave the comment empty, or more than 5 files, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   delete:
 *     summary: Delete a comment and its files
 *     description: The author, a tutor of the class, or an admin.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: commentId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Comment deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *       403: { description: A student deleting someone else's comment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task or comment not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */

/**
 * @swagger
 * /tasks/{id}/attachments:
 *   post:
 *     summary: Attach files to the task (Tutor in class or Admin)
 *     description: Up to 10 files per task. Students attach files through comments.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/TaskFilesUpload' }
 *     responses:
 *       201:
 *         description: Files attached
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/TaskAttachmentItem' }
 *       400: { description: File type not allowed or too many files, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller is a student, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Class is archived, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       413: { description: A file is over 15 MB, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: No files, or over 10 files on the task, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */

/**
 * @swagger
 * /tasks/{id}/attachments/{attachmentId}:
 *   delete:
 *     summary: Remove a file from the task (Tutor in class or Admin)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: attachmentId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: File removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *       403: { description: Caller is a student, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task or file not found (comment files are removed through their comment), content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
/**
 * @swagger
 * /tasks/{id}/attachments/{attachmentId}/download:
 *   get:
 *     summary: Get a short-lived download link for a task or comment file
 *     description: |
 *       Any class member or admin. Returns a 5-minute link that makes the browser save the
 *       file under its original name (the public `fileUrl` opens inline instead).
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: attachmentId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Download link
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     url: { type: string }
 *                     fileName: { type: string }
 *       404: { description: Task or file not found, or caller not in the class, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
export function mountTaskCommentRoutes(router: Router) {
  const files = taskFilesUpload.array("files", MAX_TASK_FILES);
  router.get("/:id/comments", authenticate, listCommentsHandler);
  router.post("/:id/comments", authenticate, taskUploadLimiter, files, createCommentHandler);
  router.patch("/:id/comments/:commentId", authenticate, taskUploadLimiter, files, updateCommentHandler);
  router.delete("/:id/comments/:commentId", authenticate, deleteCommentHandler);
  router.post("/:id/attachments", authenticate, taskUploadLimiter, files, addTaskAttachmentsHandler);
  router.delete("/:id/attachments/:attachmentId", authenticate, deleteTaskAttachmentHandler);
  router.get("/:id/attachments/:attachmentId/download", authenticate, downloadTaskFileHandler);
}
