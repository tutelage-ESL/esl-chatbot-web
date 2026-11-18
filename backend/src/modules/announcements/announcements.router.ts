import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import { taskFilesUpload, MAX_TASK_FILES } from "../../middlewares/upload.ts";
import { taskUploadLimiter } from "../../middlewares/rateLimits.ts";
import {
  listAnnouncementsHandler,
  createAnnouncementHandler,
  updateAnnouncementHandler,
  deleteAnnouncementHandler,
  addAnnouncementFilesHandler,
  deleteAnnouncementFileHandler,
  downloadAnnouncementFileHandler,
  listAnnouncementCommentsHandler,
  createAnnouncementCommentHandler,
  updateAnnouncementCommentHandler,
  deleteAnnouncementCommentHandler,
} from "./announcements.controller.ts";

const router = Router({ mergeParams: true });
const files = taskFilesUpload.array("files", MAX_TASK_FILES);

/**
 * @swagger
 * tags:
 *   name: Announcements
 *   description: |
 *     Class announcements and their comments. Read: any class member or admin. Post and turn
 *     comments on/off: tutors of the class and admins. Edit, delete and files: the author or an
 *     admin. Comment: any member (students only while comments are on). Edit a comment: its
 *     author. Delete a comment: its author, a tutor of the class, or an admin. Nothing new is
 *     written in an archived class (409).
 * components:
 *   schemas:
 *     AnnouncementAttachmentItem:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         fileName: { type: string, example: "timetable.pdf" }
 *         fileUrl: { type: string }
 *         mimeType: { type: string, example: "application/pdf" }
 *         size: { type: integer, description: Bytes }
 *         createdAt: { type: string, format: date-time }
 *     AnnouncementItem:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         classId: { type: string, format: uuid }
 *         authorId: { type: string, format: uuid }
 *         content: { type: string }
 *         commentsEnabled: { type: boolean, description: "Students can comment only while this is on" }
 *         editedAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         author:
 *           type: object
 *           properties:
 *             id: { type: string, format: uuid }
 *             displayName: { type: string }
 *             avatarUrl: { type: string, nullable: true }
 *         attachments:
 *           type: array
 *           items: { $ref: '#/components/schemas/AnnouncementAttachmentItem' }
 *         commentCount: { type: integer }
 *     AnnouncementCommentItem:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         announcementId: { type: string, format: uuid }
 *         content: { type: string }
 *         editedAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         author:
 *           type: object
 *           properties:
 *             id: { type: string, format: uuid }
 *             displayName: { type: string }
 *             avatarUrl: { type: string, nullable: true }
 *             classRole: { type: string, enum: [TUTOR, STUDENT, ADMIN] }
 *   parameters:
 *     AnnouncementClassId: { in: path, name: id, required: true, schema: { type: string, format: uuid }, description: Class ID }
 *     AnnouncementId: { in: path, name: announcementId, required: true, schema: { type: string, format: uuid } }
 */

/**
 * @swagger
 * /classes/{id}/announcements:
 *   get:
 *     summary: List a class's announcements, newest first
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       200:
 *         description: Announcements with their files and comment counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/AnnouncementItem' } }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       404: { description: Class not found or caller not a member, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   post:
 *     summary: Post an announcement, optionally with files (tutor of the class or admin)
 *     description: Comments start switched on. Notifies every student in the class (CLASS_ANNOUNCEMENT).
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, minLength: 1, maxLength: 2000 }
 *               files: { type: array, maxItems: 5, items: { type: string, format: binary } }
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, minLength: 1, maxLength: 2000 }
 *     responses:
 *       201:
 *         description: Announcement posted
 *         content: { application/json: { schema: { type: object, properties: { success: { type: boolean }, data: { $ref: '#/components/schemas/AnnouncementItem' } } } } }
 *       403: { description: Caller is not a tutor of the class, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Class is archived, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/", authenticate, listAnnouncementsHandler);
router.post("/", authenticate, taskUploadLimiter, files, createAnnouncementHandler);

/**
 * @swagger
 * /classes/{id}/announcements/{announcementId}:
 *   patch:
 *     summary: Edit the text (author or admin) and/or turn comments on or off (tutor of the class or admin)
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *       - $ref: '#/components/parameters/AnnouncementId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string, minLength: 1, maxLength: 2000 }
 *               commentsEnabled: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated announcement
 *         content: { application/json: { schema: { type: object, properties: { success: { type: boolean }, data: { $ref: '#/components/schemas/AnnouncementItem' } } } } }
 *       403: { description: Not allowed for this change, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Announcement not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Class is archived, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   delete:
 *     summary: Delete an announcement with its comments and files (author or admin)
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *       - $ref: '#/components/parameters/AnnouncementId'
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not the author, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Announcement not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.patch("/:announcementId", authenticate, updateAnnouncementHandler);
router.delete("/:announcementId", authenticate, deleteAnnouncementHandler);

/**
 * @swagger
 * /classes/{id}/announcements/{announcementId}/attachments:
 *   post:
 *     summary: Attach files to an announcement (author or admin; up to 10 in total)
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *       - $ref: '#/components/parameters/AnnouncementId'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files: { type: array, maxItems: 5, items: { type: string, format: binary } }
 *     responses:
 *       201:
 *         description: The new files
 *         content: { application/json: { schema: { type: object, properties: { success: { type: boolean }, data: { type: array, items: { $ref: '#/components/schemas/AnnouncementAttachmentItem' } } } } } }
 * /classes/{id}/announcements/{announcementId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Remove a file from an announcement (author or admin)
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *       - $ref: '#/components/parameters/AnnouncementId'
 *       - { in: path, name: attachmentId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Removed }
 * /classes/{id}/announcements/{announcementId}/attachments/{attachmentId}/download:
 *   get:
 *     summary: A 5-minute link that downloads the file under its name (any class member)
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *       - $ref: '#/components/parameters/AnnouncementId'
 *       - { in: path, name: attachmentId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Download link
 *         content: { application/json: { schema: { type: object, properties: { success: { type: boolean }, data: { type: object, properties: { url: { type: string }, fileName: { type: string } } } } } } }
 */
router.post("/:announcementId/attachments", authenticate, taskUploadLimiter, files, addAnnouncementFilesHandler);
router.delete("/:announcementId/attachments/:attachmentId", authenticate, deleteAnnouncementFileHandler);
router.get("/:announcementId/attachments/:attachmentId/download", authenticate, downloadAnnouncementFileHandler);

/**
 * @swagger
 * /classes/{id}/announcements/{announcementId}/comments:
 *   get:
 *     summary: List an announcement's comments, oldest first (any class member)
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *       - $ref: '#/components/parameters/AnnouncementId'
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100, default: 100 } }
 *     responses:
 *       200:
 *         description: Comments
 *         content: { application/json: { schema: { type: object, properties: { success: { type: boolean }, data: { type: array, items: { $ref: '#/components/schemas/AnnouncementCommentItem' } } } } } }
 *   post:
 *     summary: Comment on an announcement (students only while comments are on)
 *     description: Notifies the announcement's author and everyone who already commented (ANNOUNCEMENT_COMMENT), never the commenter.
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *       - $ref: '#/components/parameters/AnnouncementId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [content], properties: { content: { type: string, minLength: 1, maxLength: 2000 } } }
 *     responses:
 *       201:
 *         description: Comment posted
 *         content: { application/json: { schema: { type: object, properties: { success: { type: boolean }, data: { $ref: '#/components/schemas/AnnouncementCommentItem' } } } } }
 *       403: { description: Comments are off, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Class is archived, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 * /classes/{id}/announcements/{announcementId}/comments/{commentId}:
 *   patch:
 *     summary: Edit your own comment
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *       - $ref: '#/components/parameters/AnnouncementId'
 *       - { in: path, name: commentId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [content], properties: { content: { type: string, minLength: 1, maxLength: 2000 } } }
 *     responses:
 *       200:
 *         description: Updated comment
 *         content: { application/json: { schema: { type: object, properties: { success: { type: boolean }, data: { $ref: '#/components/schemas/AnnouncementCommentItem' } } } } }
 *       403: { description: Not your comment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   delete:
 *     summary: Delete a comment (its author, a tutor of the class, or an admin)
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/AnnouncementClassId'
 *       - $ref: '#/components/parameters/AnnouncementId'
 *       - { in: path, name: commentId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not allowed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/:announcementId/comments", authenticate, listAnnouncementCommentsHandler);
router.post("/:announcementId/comments", authenticate, createAnnouncementCommentHandler);
router.patch("/:announcementId/comments/:commentId", authenticate, updateAnnouncementCommentHandler);
router.delete("/:announcementId/comments/:commentId", authenticate, deleteAnnouncementCommentHandler);

export default router;
