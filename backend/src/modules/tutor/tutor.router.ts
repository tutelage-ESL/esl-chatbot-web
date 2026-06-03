import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import { authorize } from "../../middlewares/authorize.ts";
import { getTutorDashboardHandler } from "./tutor.controller.ts";

const router = Router();

router.use(authenticate, authorize("TUTOR", "ADMIN"));

/**
 * @swagger
 * tags:
 *   name: Tutor
 *   description: Tutor-specific operations and dashboard
 */

/**
 * @swagger
 * /tutor/dashboard:
 *   get:
 *     summary: Tutor dashboard overview stats — Tutor or Admin only
 *     description: |
 *       Returns an aggregated snapshot of the tutor's classes and student activity:
 *       - Total and active classes the tutor teaches
 *       - Total students across all classes, plus daily/weekly active counts
 *       - Average skill scores (grammar, vocabulary, fluency, speaking) across all students
 *       - Total sessions started today by the tutor's students
 *       - 8 most recent student sessions with scores
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tutor dashboard stats
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
 *                     classes:
 *                       type: object
 *                       properties:
 *                         total: { type: integer, example: 3 }
 *                         active: { type: integer, example: 2 }
 *                     students:
 *                       type: object
 *                       properties:
 *                         total: { type: integer, example: 24 }
 *                         activeToday: { type: integer, example: 6 }
 *                         activeThisWeek: { type: integer, example: 18 }
 *                     skills:
 *                       type: object
 *                       properties:
 *                         avgGrammar: { type: integer, example: 72 }
 *                         avgVocabulary: { type: integer, example: 68 }
 *                         avgFluency: { type: integer, example: 65 }
 *                         avgSpeaking: { type: integer, example: 58 }
 *                     sessionsToday: { type: integer, example: 8 }
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId: { type: string, format: uuid }
 *                           displayName: { type: string }
 *                           avatarUrl: { type: string, format: uri, nullable: true }
 *                           sessionMode: { type: string, enum: [TEXT, VOICE] }
 *                           startedAt: { type: string, format: date-time }
 *                           avgOverallScore: { type: integer, nullable: true }
 *                           className: { type: string }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Not a tutor or admin, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/dashboard", getTutorDashboardHandler);

export default router;
