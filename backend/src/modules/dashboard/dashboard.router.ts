import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import { getDashboardOverviewHandler } from "./dashboard.controller.ts";

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
 *     summary: Get all dashboard overview data in one call
 *     description: |
 *       Returns a single aggregated payload covering all six dashboard sections.
 *       All six section queries run in parallel — typical response time is one DB round-trip.
 *
 *       **Sections:**
 *       - `greetingHero` — streak, today's study minutes vs daily goal, due vocab count
 *       - `statCards` — words mastered, practice time, pronunciation score, current CEFR level
 *       - `vocabChart` — 6-week cumulative vocabulary growth points + growth %
 *       - `nextUp` — primary active goal + up to 3 others (Goals replace Lessons until Lesson model is built)
 *       - `activityHeatmap` — 12 × 7 day grid of session counts + 5 recent sessions
 *       - `dueWords` — top 4 SRS cards due now + total due count + CEFR level progress %
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview data
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
 *                     greetingHero:
 *                       type: object
 *                       properties:
 *                         streak: { type: integer, example: 7 }
 *                         doneMins: { type: integer, example: 17 }
 *                         goalMins: { type: integer, example: 25 }
 *                         dueVocabCount: { type: integer, example: 12 }
 *                     statCards:
 *                       type: object
 *                       properties:
 *                         wordsMastered: { type: integer, example: 248 }
 *                         wordsMasteredWeekDelta: { type: integer, example: 12 }
 *                         practiceTimeMinutes: { type: integer, example: 2520 }
 *                         practiceTimeThisMonthMinutes: { type: integer, example: 420 }
 *                         pronunciationScore: { type: integer, example: 82 }
 *                         pronunciationDelta: { type: integer, nullable: true, example: 4 }
 *                         currentLevel: { type: string, nullable: true, example: B2 }
 *                         levelPct: { type: integer, example: 60 }
 *                     vocabChart:
 *                       type: object
 *                       properties:
 *                         points:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               label: { type: string, example: "May 5" }
 *                               value: { type: integer, example: 120 }
 *                         totalWords: { type: integer, example: 156 }
 *                         growthPct: { type: number, example: 12.4 }
 *                     nextUp:
 *                       type: object
 *                       properties:
 *                         primary:
 *                           nullable: true
 *                           type: object
 *                           properties:
 *                             id: { type: string, format: uuid }
 *                             type: { type: string, example: VOCABULARY }
 *                             description: { type: string }
 *                             target: { type: integer }
 *                             progress: { type: number }
 *                             difficulty: { type: string, nullable: true }
 *                             targetDate: { type: string, format: date-time, nullable: true }
 *                         others:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               type: { type: string }
 *                               description: { type: string }
 *                               target: { type: integer }
 *                               progress: { type: number }
 *                               difficulty: { type: string, nullable: true }
 *                               targetDate: { type: string, format: date-time, nullable: true }
 *                     activityHeatmap:
 *                       type: object
 *                       properties:
 *                         weeks:
 *                           type: array
 *                           description: 12 arrays of 7 integers (0–7), one per day
 *                           items:
 *                             type: array
 *                             items: { type: integer }
 *                         activePct: { type: integer, example: 78 }
 *                         recentSessions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               mode: { type: string, enum: [TEXT, VOICE] }
 *                               topic: { type: string, nullable: true }
 *                               startedAt: { type: string, format: date-time }
 *                               durationSeconds: { type: integer, nullable: true }
 *                               messageCount: { type: integer }
 *                               avgOverallScore: { type: integer, nullable: true }
 *                               avgPronunciationScore: { type: integer, nullable: true }
 *                     dueWords:
 *                       type: object
 *                       properties:
 *                         words:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               word: { type: string }
 *                               definition: { type: string }
 *                               srsDue: { type: string, format: date-time }
 *                         totalDue: { type: integer, example: 12 }
 *                         levelPct: { type: integer, example: 60 }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/overview", authenticate, getDashboardOverviewHandler);

export default router;
