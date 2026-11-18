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
 *     summary: Tutor home dashboard
 *     description: |
 *       What needs the tutor next across their (non-archived) classes: hand-ins to review
 *       (oldest first), deadlines in the next 7 days, students with no AI practice for 7+ days,
 *       per-class health and the most common mistakes. Skill averages cover only students who
 *       have practised. "Active" = sent the AI tutor a message in the last 7 days.
 *     tags: [Tutor]
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
 *                     totals:
 *                       type: object
 *                       properties:
 *                         classes: { type: integer }
 *                         students: { type: integer }
 *                         activeThisWeek: { type: integer }
 *                         toReview: { type: integer }
 *                         missing: { type: integer }
 *                     needsYou:
 *                       type: object
 *                       properties:
 *                         toReview:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               submissionId: { type: string, format: uuid }
 *                               taskId: { type: string, format: uuid }
 *                               classId: { type: string, format: uuid }
 *                               taskTitle: { type: string }
 *                               className: { type: string }
 *                               studentName: { type: string }
 *                               handedInAt: { type: string, format: date-time }
 *                         dueSoon:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               taskId: { type: string, format: uuid }
 *                               classId: { type: string, format: uuid }
 *                               title: { type: string }
 *                               className: { type: string }
 *                               deadline: { type: string, format: date-time }
 *                               handedIn: { type: integer }
 *                               students: { type: integer }
 *                         inactive:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId: { type: string, format: uuid }
 *                               classId: { type: string, format: uuid }
 *                               displayName: { type: string }
 *                               avatarUrl: { type: string, nullable: true }
 *                               className: { type: string }
 *                               lastPracticeAt: { type: string, format: date-time, nullable: true }
 *                         inactiveCount: { type: integer }
 *                     classes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           name: { type: string }
 *                           students: { type: integer }
 *                           activeThisWeek: { type: integer }
 *                           handInRate: { type: integer, nullable: true, description: "% handed in over tasks past their deadline" }
 *                           missing: { type: integer }
 *                           toReview: { type: integer }
 *                           avgSkill: { type: integer, nullable: true }
 *                     skills:
 *                       type: object
 *                       properties:
 *                         grammar: { type: number }
 *                         vocabulary: { type: number }
 *                         fluency: { type: number }
 *                         speaking: { type: number }
 *                         practisingStudents: { type: integer }
 *                     commonMistakes:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/StudentMistake' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller is not a tutor or admin, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/dashboard", getTutorDashboardHandler);

export default router;
