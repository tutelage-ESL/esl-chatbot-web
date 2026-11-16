import { Router } from "express";
import {
  listGoalsHandler,
  createGoalHandler,
  getGoalHandler,
  updateGoalHandler,
  deleteGoalHandler,
} from "./goals.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Goals
 *   description: Learning goals — students self-set, tutors can assign to students
 */

/**
 * @swagger
 * /goals:
 *   get:
 *     summary: List goals
 *     description: Students see their own goals. Tutors/admins can add `?studentId=` to view a specific student's goals (tutors must have the student in one of their classes).
 *     tags: [Goals]
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
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, PAUSED, CANCELLED]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [VOCABULARY, SPEAKING, GRAMMAR, CONVERSATION, STUDY_TIME]
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tutor/admin only — view a specific student's goals
 *     responses:
 *       200:
 *         description: Paginated goal list
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
 *                     $ref: '#/components/schemas/Goal'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", authenticate, listGoalsHandler);

/**
 * @swagger
 * /goals:
 *   post:
 *     summary: Create a goal
 *     description: Students create goals for themselves. Tutors/admins provide `assignedToUserId` to assign a goal to a student.
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, description, target]
 *             properties:
 *               assignedToUserId:
 *                 type: string
 *                 format: uuid
 *                 description: Target student (tutor/admin only — omit when creating own goal)
 *               type:
 *                 type: string
 *                 enum: [VOCABULARY, SPEAKING, GRAMMAR, CONVERSATION, STUDY_TIME]
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               target:
 *                 type: integer
 *                 minimum: 1
 *                 description: Numeric goal target (e.g. 50 words, 10 sessions, 30 minutes)
 *               difficulty:
 *                 type: string
 *                 enum: [EASY, MEDIUM, HARD, EXPERT]
 *               targetDate:
 *                 type: string
 *                 format: date-time
 *               actionPlan:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Goal created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Goal'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post("/", authenticate, createGoalHandler);

/**
 * @swagger
 * /goals/{id}:
 *   get:
 *     summary: Get a single goal
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Goal detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Goal'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", authenticate, getGoalHandler);

/**
 * @swagger
 * /goals/{id}:
 *   patch:
 *     summary: Update a goal
 *     description: Update description, target, difficulty, status, progress, targetDate, or actionPlan. Setting status to COMPLETED auto-sets completedDate and progress to 100.
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               target:
 *                 type: integer
 *                 minimum: 1
 *               difficulty:
 *                 type: string
 *                 enum: [EASY, MEDIUM, HARD, EXPERT]
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, COMPLETED, PAUSED, CANCELLED]
 *               progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               targetDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               actionPlan:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated goal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Goal'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.patch("/:id", authenticate, updateGoalHandler);

/**
 * @swagger
 * /goals/{id}:
 *   delete:
 *     summary: Delete a goal
 *     description: Students can delete their own goals. Tutors can delete goals they assigned. Admins can delete any goal.
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Goal deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", authenticate, deleteGoalHandler);

export default router;
