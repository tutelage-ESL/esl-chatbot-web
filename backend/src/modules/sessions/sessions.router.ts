import { Router } from "express";
import {
  createSessionHandler,
  listSessionsHandler,
  getSessionHandler,
  endSessionHandler,
  getSessionStatsHandler,
  getSessionUsageHandler,
  updateSessionHandler,
  deleteSessionHandler,
} from "./sessions.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";
import { authorize } from "../../middlewares/authorize.ts";
import { createSessionLimiter } from "../../middlewares/rateLimits.ts";

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
 *         title: { type: string, nullable: true, description: "AI-given name, renamable. Null until the first reply." }
 *         isPinned: { type: boolean }
 *         summary: { type: string, nullable: true }
 *         startedAt: { type: string, format: date-time }
 *         endedAt: { type: string, format: date-time, nullable: true }
 *         durationSeconds: { type: integer, nullable: true }
 *         messageCount: { type: integer }
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
 *         avgPronunciationScore: { type: number, nullable: true, description: "null for text sessions" }
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
// ─────────────────────────────────────────────────────────
// SESSION STATS
// ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /sessions/stats:
 *   get:
 *     summary: Session history stats for charts
 *     description: |
 *       Returns per-day session counts and duration totals for the last N days
 *       (default 30, max 90), plus overall totals.
 *
 *       Students see their own stats. Tutors and admins can pass `?userId=` to
 *       view a specific user's stats.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 1, maximum: 90, default: 30 }
 *         description: Number of calendar days to look back (including today)
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *         description: Target user — tutor/admin only; defaults to own ID
 *     responses:
 *       200:
 *         description: Session stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     days: { type: integer }
 *                     totalSessions: { type: integer }
 *                     averageDurationSeconds: { type: integer }
 *                     dailyStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string, format: date, example: "2026-05-01" }
 *                           sessionCount: { type: integer }
 *                           totalDurationSeconds: { type: integer }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller lacks permission to view target user's stats, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Invalid query params, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/stats", authenticate, getSessionStatsHandler);

/**
 * @swagger
 * /sessions/usage:
 *   get:
 *     summary: Today's plan usage — can the caller start a conversation right now?
 *     description: |
 *       Same rules as `POST /sessions` and sending a message: an ACTIVE subscription,
 *       the daily session cap (all modes), and FREE's daily message cap. Pages use it
 *       to show a locked state up front instead of failing mid-conversation.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   required: [plan, active, sessionsToday, sessionsPerDay, messagesToday, messagesPerDay, canStart, reason, resetsInSeconds]
 *                   properties:
 *                     plan: { type: string, enum: [FREE, GOLD, PREMIUM] }
 *                     active: { type: boolean, description: Subscription status is ACTIVE }
 *                     sessionsToday: { type: integer }
 *                     sessionsPerDay: { type: integer }
 *                     messagesToday: { type: integer }
 *                     messagesPerDay: { type: integer, nullable: true, description: FREE only; null = no daily cap }
 *                     canStart: { type: boolean }
 *                     reason: { type: string, nullable: true, enum: [INACTIVE, SESSION_LIMIT, MESSAGE_LIMIT] }
 *                     resetsInSeconds: { type: integer, description: Seconds until the daily counters reset }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/usage", authenticate, getSessionUsageHandler);

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
 *       429: { description: Daily session limit reached, or rate limit exceeded (20 per hour per user), content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post("/", authenticate, authorize("STUDENT"), createSessionLimiter, createSessionHandler);

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

// ─────────────────────────────────────────────────────────
// RENAME / PIN / DELETE
// ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /sessions/{id}:
 *   patch:
 *     summary: Rename or pin one of your own chats
 *     description: Send any of `{ title (1-60), isPinned }`. Pinned chats are listed first.
 *     tags: [Sessions]
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
 *               title: { type: string, minLength: 1, maxLength: 60 }
 *               isPinned: { type: boolean }
 *     responses:
 *       200:
 *         description: Session updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/SessionListItem' }
 *       422: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Session not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   delete:
 *     summary: Delete one of your own chats
 *     description: |
 *       Hides the chat from your list for good. It still counts toward the daily
 *       session and message limits, and stays in tutor/admin stats.
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
 *         description: Session deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Session not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.patch("/:id", authenticate, updateSessionHandler);
router.delete("/:id", authenticate, deleteSessionHandler);

export default router;
