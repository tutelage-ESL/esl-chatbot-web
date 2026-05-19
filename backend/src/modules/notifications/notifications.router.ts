import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import { listNotificationsHandler, markAllReadHandler } from "./notifications.controller.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notification feed for the authenticated user
 */

/**
 * @swagger
 * /users/me/notifications:
 *   get:
 *     summary: List own notifications (newest first)
 *     description: |
 *       Returns the authenticated user's notification feed, paginated and
 *       sorted newest-first. Filter by `?read=false` to show only unread.
 *
 *       Notification types:
 *       - `STREAK_MILESTONE` — reached a 7-day or 30-day streak
 *       - `GOAL_COMPLETED` — a goal was marked completed
 *       - `GOAL_ASSIGNED` — a tutor assigned you a new goal
 *       - `CLASS_ANNOUNCEMENT` — new announcement in one of your classes
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: read
 *         schema: { type: string, enum: ["true", "false"] }
 *         description: Filter by read status. Omit to return all.
 *     responses:
 *       200:
 *         description: Paginated notification feed
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
 *                       type: { type: string, enum: [STREAK_MILESTONE, GOAL_COMPLETED, GOAL_ASSIGNED, CLASS_ANNOUNCEMENT] }
 *                       message: { type: string }
 *                       read: { type: boolean }
 *                       createdAt: { type: string, format: date-time }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/me/notifications", authenticate, listNotificationsHandler);

/**
 * @swagger
 * /users/me/notifications/read-all:
 *   patch:
 *     summary: Mark all unread notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { nullable: true, example: null }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.patch("/me/notifications/read-all", authenticate, markAllReadHandler);

export default router;
