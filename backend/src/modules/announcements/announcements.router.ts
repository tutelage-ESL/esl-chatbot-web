import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import {
  listAnnouncementsHandler,
  createAnnouncementHandler,
} from "./announcements.controller.ts";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Announcements
 *   description: Class announcements — tutor broadcasts, students read
 */

/**
 * @swagger
 * /classes/{id}/announcements:
 *   get:
 *     summary: List announcements for a class
 *     description: |
 *       Returns announcements for the class, newest first. Any class member
 *       (tutor or student) can read announcements. Admins can read any class.
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Class ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of announcements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       classId: { type: string, format: uuid }
 *                       authorId: { type: string, format: uuid }
 *                       content: { type: string }
 *                       createdAt: { type: string, format: date-time }
 *                       author:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           displayName: { type: string }
 *                           avatarUrl: { type: string, nullable: true }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Class not found or caller not a member, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   post:
 *     summary: Post an announcement to a class (Tutor in class or Admin)
 *     description: |
 *       Creates a new announcement visible to all class members.
 *       Also creates a `CLASS_ANNOUNCEMENT` notification for every
 *       student in the class.
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Class ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Announcement created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     classId: { type: string, format: uuid }
 *                     authorId: { type: string, format: uuid }
 *                     content: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *                     author:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         displayName: { type: string }
 *                         avatarUrl: { type: string, nullable: true }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller is a student (not tutor or admin), content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Class not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/", authenticate, listAnnouncementsHandler);
router.post("/", authenticate, createAnnouncementHandler);

export default router;
