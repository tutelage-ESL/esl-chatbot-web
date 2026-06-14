import { Router } from "express";
import { globalSearchHandler } from "./search.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Role-aware global search across the platform
 */

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Global search
 *     description: >
 *       Role-aware search across multiple entity types. Every user searches their
 *       own learner content (vocabulary, goals, sessions). Classes are scoped by
 *       role (ADMIN sees all; TUTOR/STUDENT see only classes they belong to).
 *       Users are returned for ADMIN only (stealth internal accounts excluded).
 *       Each group is capped to a small number of results for a quick palette.
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search term
 *     responses:
 *       200:
 *         description: Grouped, role-scoped search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/SearchResults'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get("/", authenticate, globalSearchHandler);

/**
 * @swagger
 * components:
 *   schemas:
 *     SearchUserResult:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         displayName: { type: string }
 *         username: { type: string }
 *         email: { type: string, format: email }
 *         avatarUrl: { type: string, format: uri, nullable: true }
 *         role: { type: string, enum: [STUDENT, TUTOR, ADMIN] }
 *     SearchClassResult:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         className: { type: string }
 *         classCategory: { type: string, nullable: true }
 *     SearchVocabResult:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         word: { type: string }
 *         definition: { type: string }
 *     SearchGoalResult:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         description: { type: string }
 *         type: { type: string, enum: [VOCABULARY, SPEAKING, GRAMMAR, CONVERSATION, STUDY_TIME] }
 *         status: { type: string, enum: [ACTIVE, COMPLETED, PAUSED, CANCELLED] }
 *     SearchSessionResult:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         topic: { type: string, nullable: true }
 *         startedAt: { type: string, format: date-time }
 *     SearchResults:
 *       type: object
 *       properties:
 *         query:
 *           type: string
 *         total:
 *           type: integer
 *           description: Total number of results across all groups
 *         results:
 *           type: object
 *           properties:
 *             users:
 *               type: array
 *               items: { $ref: '#/components/schemas/SearchUserResult' }
 *             classes:
 *               type: array
 *               items: { $ref: '#/components/schemas/SearchClassResult' }
 *             vocabulary:
 *               type: array
 *               items: { $ref: '#/components/schemas/SearchVocabResult' }
 *             goals:
 *               type: array
 *               items: { $ref: '#/components/schemas/SearchGoalResult' }
 *             sessions:
 *               type: array
 *               items: { $ref: '#/components/schemas/SearchSessionResult' }
 */

export default router;
