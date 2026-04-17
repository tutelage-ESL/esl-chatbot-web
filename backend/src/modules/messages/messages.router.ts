import { Router } from "express";
import { sendMessageHandler, listMessagesHandler } from "./messages.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Send and retrieve messages within a conversation session
 */

// ─────────────────────────────────────────────────────────
// LIST MESSAGES
// ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /sessions/{sessionId}/messages:
 *   get:
 *     summary: List messages in a session (paginated)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated list of messages with evaluations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       role: { type: string, enum: [USER, ASSISTANT] }
 *                       type: { type: string, enum: [TEXT, VOICE] }
 *                       content: { type: string }
 *                       wordCount: { type: integer, nullable: true }
 *                       audioUrl: { type: string, nullable: true }
 *                       audioDurationSec: { type: number, nullable: true }
 *                       createdAt: { type: string, format: date-time }
 *                       evaluation:
 *                         nullable: true
 *                         allOf:
 *                           - { $ref: '#/components/schemas/MessageEvaluation' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Session not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/:sessionId/messages", authenticate, listMessagesHandler);

// ─────────────────────────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /sessions/{sessionId}/messages:
 *   post:
 *     summary: Send a message and get AI response with evaluation
 *     description: |
 *       Sends a user message in the session, triggers an AI response, and
 *       evaluates the user's message for grammar, vocabulary, and fluency.
 *
 *       Returns the user message, AI response, and evaluation in one call.
 *
 *       Per-session message limits (user messages only):
 *       - FREE plan: 20 messages (soft) + 10 buffer · 20 messages/day cap across all sessions · 10-message AI context
 *       - GOLD plan: 100 messages (soft) + 10 buffer · 20-message AI context
 *       - PREMIUM plan: 150 messages (soft) + 10 buffer · 20-message AI context
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *               type:
 *                 type: string
 *                 enum: [TEXT, VOICE]
 *                 default: TEXT
 *     responses:
 *       201:
 *         description: Message sent, AI responded, evaluation generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     userMessage:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         role: { type: string, example: USER }
 *                         type: { type: string, enum: [TEXT, VOICE] }
 *                         content: { type: string }
 *                         wordCount: { type: integer }
 *                         createdAt: { type: string, format: date-time }
 *                     assistantMessage:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         role: { type: string, example: ASSISTANT }
 *                         type: { type: string, enum: [TEXT, VOICE] }
 *                         content: { type: string }
 *                         wordCount: { type: integer }
 *                         createdAt: { type: string, format: date-time }
 *                     evaluation:
 *                       $ref: '#/components/schemas/MessageEvaluation'
 *       400: { description: Invalid body, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Session not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Session already ended, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       429: { description: Message limit reached, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post("/:sessionId/messages", authenticate, sendMessageHandler);

export default router;
