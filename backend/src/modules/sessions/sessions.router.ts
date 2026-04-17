import { Router } from "express";
import {
  createSessionHandler,
  listSessionsHandler,
  getSessionHandler,
  endSessionHandler,
} from "./sessions.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: Conversation session lifecycle — create, list, get, end
 *
 * components:
 *   schemas:
 *     SessionListItem:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         mode: { type: string, enum: [TEXT, VOICE] }
 *         topic: { type: string, nullable: true }
 *         summary: { type: string, nullable: true }
 *         startedAt: { type: string, format: date-time }
 *         endedAt: { type: string, format: date-time, nullable: true }
 *         durationSeconds: { type: integer, nullable: true }
 *         messageCount: { type: integer }
 *         averageScore: { type: number, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *     MessageEvaluation:
 *       type: object
 *       properties:
 *         grammarScore: { type: integer, minimum: 0, maximum: 100 }
 *         grammarErrors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               error: { type: string }
 *               correction: { type: string }
 *               rule: { type: string }
 *               severity: { type: string, enum: [minor, major, critical] }
 *         vocabularyScore: { type: integer, minimum: 0, maximum: 100 }
 *         vocabularyLevel: { type: string, enum: [A1, A2, B1, B2, C1, C2] }
 *         fluencyScore: { type: integer, minimum: 0, maximum: 100 }
 *         pronunciationScore: { type: integer, nullable: true, minimum: 0, maximum: 100 }
 *         pronunciationIssues:
 *           type: array
 *           nullable: true
 *           items:
 *             type: object
 *             properties:
 *               word: { type: string }
 *               issue: { type: string }
 *               suggestion: { type: string }
 *         overallScore: { type: integer, minimum: 0, maximum: 100 }
 *         detectedCefrLevel: { type: string, enum: [A1, A2, B1, B2, C1, C2] }
 *         corrections:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               original: { type: string }
 *               corrected: { type: string }
 *               explanation: { type: string }
 *         feedback: { type: string }
 *     SessionEvaluation:
 *       type: object
 *       properties:
 *         topicsCovered: { type: array, items: { type: string } }
 *         avgGrammarScore: { type: number }
 *         avgVocabularyScore: { type: number }
 *         avgFluencyScore: { type: number }
 *         avgOverallScore: { type: number }
 *         detectedCefrLevel: { type: string, enum: [A1, A2, B1, B2, C1, C2] }
 *         strengths: { type: array, items: { type: string } }
 *         weaknesses: { type: array, items: { type: string } }
 *         recommendations: { type: array, items: { type: string } }
 *         newVocabulary: { type: array, items: { type: string } }
 *         totalUserMessages: { type: integer }
 *         totalUserWords: { type: integer }
 */

// ─────────────────────────────────────────────────────────
// LIST SESSIONS
// ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /sessions:
 *   get:
 *     summary: List the authenticated user's conversation sessions
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: mode
 *         schema: { type: string, enum: [TEXT, VOICE] }
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: ["true", "false"] }
 *         description: Filter by active (not ended) or ended sessions
 *     responses:
 *       200:
 *         description: Paginated list of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/SessionListItem' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/", authenticate, listSessionsHandler);

// ─────────────────────────────────────────────────────────
// CREATE SESSION
// ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /sessions:
 *   post:
 *     summary: Start a new conversation session
 *     description: |
 *       Creates a new conversation session. Requires an active subscription.
 *
 *       Daily session limits apply:
 *       - FREE plan: 3 sessions/day
 *       - GOLD plan: 15 sessions/day
 *       - PREMIUM plan: 50 sessions/day
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [TEXT, VOICE]
 *                 default: TEXT
 *               topic:
 *                 type: string
 *                 maxLength: 200
 *                 nullable: true
 *                 description: Optional conversation topic
 *     responses:
 *       201:
 *         description: Session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/SessionListItem' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No active subscription, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       429: { description: Daily session limit reached, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post("/", authenticate, createSessionHandler);

// ─────────────────────────────────────────────────────────
// GET SESSION DETAIL
// ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /sessions/{id}:
 *   get:
 *     summary: Get a session with all messages and evaluations
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session detail with messages and evaluations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   allOf:
 *                     - { $ref: '#/components/schemas/SessionListItem' }
 *                     - type: object
 *                       properties:
 *                         userId: { type: string, format: uuid }
 *                         messages:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               role: { type: string, enum: [USER, ASSISTANT] }
 *                               type: { type: string, enum: [TEXT, VOICE] }
 *                               content: { type: string }
 *                               wordCount: { type: integer, nullable: true }
 *                               audioUrl: { type: string, nullable: true }
 *                               audioDurationSec: { type: number, nullable: true }
 *                               createdAt: { type: string, format: date-time }
 *                               evaluation:
 *                                 nullable: true
 *                                 allOf:
 *                                   - { $ref: '#/components/schemas/MessageEvaluation' }
 *                         evaluation:
 *                           nullable: true
 *                           allOf:
 *                             - { $ref: '#/components/schemas/SessionEvaluation' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Session not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/:id", authenticate, getSessionHandler);

// ─────────────────────────────────────────────────────────
// END SESSION
// ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /sessions/{id}/end:
 *   post:
 *     summary: End a conversation session
 *     description: |
 *       Ends the session, computes duration, message count, average score,
 *       and generates a session-level evaluation summary from all message
 *       evaluations. Returns the full session detail with the evaluation.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session ended with evaluation summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   allOf:
 *                     - { $ref: '#/components/schemas/SessionListItem' }
 *                     - type: object
 *                       properties:
 *                         evaluation:
 *                           $ref: '#/components/schemas/SessionEvaluation'
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Session not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Session already ended, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post("/:id/end", authenticate, endSessionHandler);

export default router;
