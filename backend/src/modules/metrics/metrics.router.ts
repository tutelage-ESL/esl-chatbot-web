import { Router } from "express";
import { getMyMetricsHandler, getStudentMetricsHandler } from "./metrics.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";
import { authorize } from "../../middlewares/authorize.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Metrics
 *   description: Lifetime aggregated learning metrics per user
 */

/**
 * @swagger
 * /metrics/me:
 *   get:
 *     summary: Get own metrics
 *     description: Returns the authenticated user's lifetime learning metrics (streaks, study time, skill scores).
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserMetrics'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/me", authenticate, getMyMetricsHandler);

/**
 * @swagger
 * /metrics/{userId}:
 *   get:
 *     summary: Get a student's metrics (tutor/admin)
 *     description: Tutors can view metrics for students in their class. Admins can view any user.
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Student metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserMetrics'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:userId", authenticate, authorize("TUTOR", "ADMIN"), getStudentMetricsHandler);

/**
 * @swagger
 * components:
 *   schemas:
 *     UserMetrics:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         totalStudyTimeMinutes:
 *           type: integer
 *           description: Cumulative study time in minutes
 *         totalWordsTyped:
 *           type: integer
 *         currentStreak:
 *           type: integer
 *           description: Current consecutive study day streak
 *         longestStreak:
 *           type: integer
 *         lastStudyDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         estimatedLevel:
 *           type: string
 *           nullable: true
 *           description: AI-estimated CEFR level (A1–C2)
 *         grammarSkill:
 *           type: number
 *           description: 0–100 rolling average grammar score
 *         vocabularySkill:
 *           type: number
 *         fluencySkill:
 *           type: number
 *         speakingSkill:
 *           type: number
 *           description: 0–100 from pronunciation scores (voice sessions only)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export default router;
