import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import {
  createTaskHandler,
  listClassTasksHandler,
  getTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  createSubmissionHandler,
  listSubmissionsHandler,
  updateFeedbackHandler,
} from "./tasks.controller.ts";

// ── Mounted at /classes/:id/tasks ─────────────────────────
export const classTasksRouter = Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Class homework tasks — tutors assign, students submit, tutors give feedback
 */

/**
 * @swagger
 * /classes/{id}/tasks:
 *   get:
 *     summary: List tasks for a class
 *     description: |
 *       Any class member can list tasks.
 *       - **Tutors / Admins** see each task with a `submissionCount`.
 *       - **Students** also receive their own `mySubmission` (null if not yet submitted).
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Class ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated task list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/TaskItem' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Class not found or caller not a member, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   post:
 *     summary: Create a task in a class (Tutor in class or Admin)
 *     description: |
 *       Creates a task and fires a `TASK_ASSIGNED` notification to every student in the class.
 *       Archived classes reject with 409.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Class ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Task created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/TaskItem' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller is a student, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Class not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Class is archived, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
classTasksRouter.get("/", authenticate, listClassTasksHandler);
classTasksRouter.post("/", authenticate, createTaskHandler);

// ── Mounted at /tasks ─────────────────────────────────────
export const tasksRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TaskAuthor:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         displayName: { type: string }
 *         avatarUrl: { type: string, nullable: true }
 *     TaskSubmissionItem:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         taskId: { type: string, format: uuid }
 *         studentId: { type: string, format: uuid }
 *         content: { type: string, nullable: true }
 *         fileUrl: { type: string, nullable: true }
 *         feedback: { type: string, nullable: true }
 *         feedbackAt: { type: string, format: date-time, nullable: true }
 *         student: { $ref: '#/components/schemas/TaskAuthor' }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     TaskItem:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         classId: { type: string, format: uuid }
 *         createdById: { type: string, format: uuid }
 *         title: { type: string }
 *         description: { type: string }
 *         deadline: { type: string, format: date-time, nullable: true }
 *         status:
 *           type: string
 *           enum: [OPEN, CLOSED]
 *         closedAt: { type: string, format: date-time, nullable: true }
 *         createdBy: { $ref: '#/components/schemas/TaskAuthor' }
 *         submissionCount: { type: integer }
 *         mySubmission:
 *           nullable: true
 *           allOf:
 *             - { $ref: '#/components/schemas/TaskSubmissionItem' }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     description: Any class member or admin can fetch the task. Students also receive their `mySubmission`.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Task detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/TaskItem' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task not found or caller not a member, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   patch:
 *     summary: Update a task (Tutor in class or Admin)
 *     description: |
 *       Update title, description, deadline, or open/close the task.
 *       Pass `closed: true` to close the task (no more submissions accepted).
 *       Pass `closed: false` to reopen it.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, minLength: 1, maxLength: 200 }
 *               description: { type: string, minLength: 1, maxLength: 5000 }
 *               deadline: { type: string, format: date-time, nullable: true }
 *               closed: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated task
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/TaskItem' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller is a student, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   delete:
 *     summary: Delete a task (Tutor in class or Admin)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Task deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller is a student, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
tasksRouter.get("/:id", authenticate, getTaskHandler);
tasksRouter.patch("/:id", authenticate, updateTaskHandler);
tasksRouter.delete("/:id", authenticate, deleteTaskHandler);

/**
 * @swagger
 * /tasks/{id}/submissions:
 *   post:
 *     summary: Submit a task (Student only)
 *     description: |
 *       A student who is a class member submits text content or a file URL (or both).
 *       One submission per student per task — 409 if already submitted.
 *       Closed tasks reject with 409.
 *       Fires a `TASK_SUBMITTED` notification to every tutor in the class.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 10000
 *               fileUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Submission created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/TaskSubmissionItem' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller is not a student, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task not found or student not in class, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Already submitted or task is closed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   get:
 *     summary: List submissions for a task (Tutor in class or Admin)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Task ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated submissions list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/TaskSubmissionItem' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller is a student, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
tasksRouter.post("/:id/submissions", authenticate, createSubmissionHandler);
tasksRouter.get("/:id/submissions", authenticate, listSubmissionsHandler);

/**
 * @swagger
 * /tasks/{id}/submissions/{submissionId}/feedback:
 *   patch:
 *     summary: Add or update feedback on a submission (Tutor in class or Admin)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Task ID
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [feedback]
 *             properties:
 *               feedback:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *     responses:
 *       200:
 *         description: Feedback saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/TaskSubmissionItem' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller is a student, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Task or submission not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
tasksRouter.patch("/:id/submissions/:submissionId/feedback", authenticate, updateFeedbackHandler);
