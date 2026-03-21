import { Router } from "express";
import { listUsers } from "./users.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";
import { authorize } from "../../middlewares/authorize.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management — admin only
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users (paginated) — Admin only
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       username:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                         nullable: true
 *                       isActive:
 *                         type: boolean
 *                       role:
 *                         type: string
 *                         enum: [STUDENT, TUTOR, ADMIN]
 *                       phoneNumber:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid query parameters
 *                 data:
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Authentication required
 *                 data:
 *                   nullable: true
 *                   example: null
 *       403:
 *         description: Authenticated but not an admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. Required role: ADMIN"
 *                 data:
 *                   nullable: true
 *                   example: null
 */
router.get("/", authenticate, authorize("ADMIN"), listUsers);

export default router;
