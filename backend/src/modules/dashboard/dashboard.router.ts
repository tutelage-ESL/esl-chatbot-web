import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import { getDashboardOverviewHandler, getVocabGrowthHandler } from "./dashboard.controller.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Aggregated overview data for the student dashboard
 */

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: Learner home dashboard
 *     description: |
 *       Everything on the learner's home page. "Today" and "this week" are the learner's own
 *       calendar (their profile time zone). Practice is recorded per message, so numbers are
 *       current without pressing End session. Cached 2 minutes, cleared on every message.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     today:
 *                       type: object
 *                       properties:
 *                         date: { type: string, example: "2026-11-18" }
 *                         minutes: { type: integer }
 *                         dailyGoalMinutes: { type: integer }
 *                         streak: { type: integer, description: 0 once a whole day was missed }
 *                         longestStreak: { type: integer }
 *                     week:
 *                       type: object
 *                       properties:
 *                         days:
 *                           type: array
 *                           description: Monday to Sunday; minutes null for days still to come
 *                           items: { type: object, properties: { date: { type: string }, minutes: { type: integer, nullable: true } } }
 *                         minutes: { type: integer }
 *                         weeklyGoalMinutes: { type: integer }
 *                     skills:
 *                       allOf:
 *                         - $ref: '#/components/schemas/SkillSnapshot'
 *                         - type: object
 *                           properties:
 *                             selfLevel: { type: string, nullable: true }
 *                             targetLevel: { type: string, nullable: true }
 *                     vocab:
 *                       type: object
 *                       properties:
 *                         total: { type: integer }
 *                         due: { type: integer }
 *                         mastered: { type: integer }
 *                         addedThisWeek: { type: integer, description: Last 7 days }
 *                         dueWords: { type: array, items: { type: object, properties: { word: { type: string }, definition: { type: string } } } }
 *                     tasks:
 *                       type: array
 *                       description: Unfinished class work across the learner's classes, soonest deadline first
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           classId: { type: string, format: uuid }
 *                           className: { type: string }
 *                           title: { type: string }
 *                           deadline: { type: string, format: date-time, nullable: true }
 *                           state: { type: string, enum: [ASSIGNED, MISSING] }
 *                     goals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           type: { type: string }
 *                           description: { type: string }
 *                           target: { type: integer }
 *                           progress: { type: integer }
 *                           targetDate: { type: string, format: date-time, nullable: true }
 *                     activity:
 *                       type: object
 *                       properties:
 *                         weeks: { type: array, description: "12 Monday-start weeks of minutes per day; null = still to come", items: { type: array, items: { type: integer, nullable: true } } }
 *                         firstDay: { type: string }
 *                         activeDays: { type: integer }
 *                     recentChats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           title: { type: string, nullable: true }
 *                           topic: { type: string, nullable: true }
 *                           mode: { type: string, enum: [TEXT, VOICE] }
 *                           startedAt: { type: string, format: date-time }
 *                           messageCount: { type: integer }
 *                           score: { type: integer, nullable: true, description: null while the chat is open }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/overview", authenticate, getDashboardOverviewHandler);

/**
 * @swagger
 * /dashboard/vocabulary-growth:
 *   get:
 *     summary: Get vocabulary growth chart data for a given time range
 *     description: |
 *       Returns cumulative vocabulary growth points for the selected range:
 *       - `7d` — 7 daily buckets (last 7 days)
 *       - `30d` — 30 daily buckets (last 30 days, default)
 *       - `all` — 12 monthly buckets (last 12 calendar months)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [7d, 30d, all]
 *           default: 30d
 *         description: Time range for the chart
 *     responses:
 *       200:
 *         description: Vocabulary growth data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     points:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label: { type: string, example: "Jun 1" }
 *                           value: { type: integer, example: 128 }
 *                     totalWords: { type: integer, example: 156 }
 *                     growthPct: { type: number, example: 12.4 }
 *                     range: { type: string, enum: [7d, 30d, all], example: 30d }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/vocabulary-growth", authenticate, getVocabGrowthHandler);

export default router;
