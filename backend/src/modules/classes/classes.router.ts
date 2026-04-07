import { Router } from "express";
import { listClasses, getClass } from "./classes.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";
import { authorize } from "../../middlewares/authorize.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Class management — admin only
 */

/**
 * @swagger
 * /classes:
 *   get:
 *     summary: List all classes (paginated) — Admin only
 *     tags: [Classes]
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
 *         description: Number of classes per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by class status
 *     responses:
 *       200:
 *         description: Paginated list of classes
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
 *                   example: Classes retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       className:
 *                         type: string
 *                       classCode:
 *                         type: string
 *                       classCategory:
 *                         type: string
 *                         nullable: true
 *                       classStatus:
 *                         type: string
 *                         enum: [ACTIVE, INACTIVE]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       memberCount:
 *                         type: integer
 *                         description: Total number of enrolled users
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
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authenticate, authorize("ADMIN"), listClasses);

/**
 * @swagger
 * /classes/{id}:
 *   get:
 *     summary: Get a single class by ID (with enrolled members) — Admin only
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Class UUID
 *     responses:
 *       200:
 *         description: Class detail with enrolled members
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
 *                   example: Class retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     className:
 *                       type: string
 *                     classCode:
 *                       type: string
 *                     classCategory:
 *                       type: string
 *                       nullable: true
 *                     classStatus:
 *                       type: string
 *                       enum: [ACTIVE, INACTIVE]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             description: ClassUser join record ID
 *                           role:
 *                             type: string
 *                             enum: [STUDENT, TUTOR, ADMIN]
 *                             description: Role of the user within this class
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               username:
 *                                 type: string
 *                               displayName:
 *                                 type: string
 *                               avatarUrl:
 *                                 type: string
 *                                 nullable: true
 *       400:
 *         description: Invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Class not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", authenticate, authorize("ADMIN"), getClass);

export default router;
