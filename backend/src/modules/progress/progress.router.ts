import { Router } from "express";
import {
  listProgressHandler,
  getTodayProgressHandler,
  getProgressSummaryHandler,
} from "./progress.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Progress
 *   description: Daily activity snapshots — one row per user per calendar day
 */

/**
 * @swagger
 * /progress:
 *   get:
 *     summary: List daily progress entries
 *     description: Returns paginated daily progress records. Optionally filter by date range.
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *           maximum: 100
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Filter from this date (YYYY-MM-DD)"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Filter up to this date (YYYY-MM-DD)"
 *     responses:
 *       200:
 *         description: Paginated progress entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProgressEntry'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", authenticate, listProgressHandler);

/**
 * @swagger
 * /progress/today:
 *   get:
 *     summary: Get today's progress entry
 *     description: Returns today's progress row, creating it if it doesn't exist yet.
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's progress entry
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProgressEntry'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/today", authenticate, getTodayProgressHandler);

/**
 * @swagger
 * /progress/summary:
 *   get:
 *     summary: Get progress chart data
 *     description: Returns a lightweight day-by-day summary for the last 7, 14, or 30 days — suitable for bar/line charts on the dashboard.
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           enum: [7, 14, 30]
 *           default: 7
 *     responses:
 *       200:
 *         description: Array of daily summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProgressSummaryDay'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get("/summary", authenticate, getProgressSummaryHandler);

/**
 * @swagger
 * components:
 *   schemas:
 *     ProgressEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         date:
 *           type: string
 *           format: date
 *         sessionsCount:
 *           type: integer
 *           description: Number of chat sessions started that day
 *         studyMinutes:
 *           type: integer
 *         messagesCount:
 *           type: integer
 *         wordsTyped:
 *           type: integer
 *         vocabularyPracticed:
 *           type: integer
 *           description: Number of SRS vocab cards reviewed
 *         goalsAdvanced:
 *           type: integer
 *         pronunciationScore:
 *           type: number
 *           nullable: true
 *         skillSnapshot:
 *           type: object
 *           nullable: true
 *           description: Skill scores at end of day (grammar, vocabulary, fluency, speaking)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ProgressSummaryDay:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *         sessionsCount:
 *           type: integer
 *         studyMinutes:
 *           type: integer
 *         messagesCount:
 *           type: integer
 *         wordsTyped:
 *           type: integer
 *         vocabularyPracticed:
 *           type: integer
 */

export default router;
