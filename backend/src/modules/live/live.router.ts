import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import { createSessionLimiter, liveTurnLimiter } from "../../middlewares/rateLimits.ts";
import { saveLiveTurnHandler, startLiveCallHandler } from "./live.controller.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Live
 *   description: Voice Lab real-time calls (Gemini Live, speech to speech)
 */

/**
 * @swagger
 * /live/calls:
 *   post:
 *     summary: Start a live call — creates a VOICE session and a one-use Gemini Live token
 *     description: |
 *       Checks the same rules as `GET /sessions/usage`, then mints a one-use token locked
 *       to the model and the tutor's instructions. The browser opens the Gemini Live
 *       WebSocket (`BidiGenerateContentConstrained?access_token=<token>`) within 60 s;
 *       the call may last up to `expiresAt` (30 min). Counts as one of today's conversations.
 *     tags: [Live]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Call ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   required: [sessionId, token, model, expiresAt]
 *                   properties:
 *                     sessionId: { type: string, format: uuid }
 *                     token: { type: string, description: One-use Gemini Live token (auth_tokens/...) }
 *                     model: { type: string, example: gemini-3.1-flash-live-preview }
 *                     expiresAt: { type: string, format: date-time }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Subscription not active, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       429: { description: Daily conversations or messages used up, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       503: { description: Live calls not configured or Google unavailable, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post("/calls", authenticate, createSessionLimiter, startLiveCallHandler);

/**
 * @swagger
 * /live/calls/{sessionId}/turns:
 *   post:
 *     summary: Save one exchange of a live call and score what the learner said
 *     description: |
 *       The browser posts the live model's transcripts after each exchange. Saves the
 *       learner's words (VOICE message, scored) and the tutor's answer, applies the plan's
 *       message limits (429 = end the call), and returns the scores. `evaluation` is null
 *       when the scorer was busy; the turn is saved either way.
 *     tags: [Live]
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
 *             required: [user]
 *             properties:
 *               user: { type: string, maxLength: 2000, description: What the learner said }
 *               tutor: { type: string, maxLength: 4000, description: What the tutor answered }
 *               audio: { type: string, description: "The learner's audio for this answer, base64 raw PCM 16 kHz 16-bit mono, up to 30 s. Saved as the message recording; Gold/Premium also get Azure pronunciation scores." }
 *     responses:
 *       201:
 *         description: Turn saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   required: [evaluation, pronunciation, remainingMessages]
 *                   properties:
 *                     pronunciation:
 *                       type: object
 *                       nullable: true
 *                       description: Gold/Premium with audio only
 *                       required: [accuracyScore, fluencyScore, completenessScore, prosodyScore, overallScore, issues]
 *                       properties:
 *                         accuracyScore: { type: number }
 *                         fluencyScore: { type: number }
 *                         completenessScore: { type: number }
 *                         prosodyScore: { type: number, nullable: true }
 *                         overallScore: { type: number }
 *                         issues:
 *                           type: array
 *                           items:
 *                             type: object
 *                             required: [word, issue, suggestion]
 *                             properties:
 *                               word: { type: string }
 *                               issue: { type: string }
 *                               suggestion: { type: string }
 *                     evaluation:
 *                       type: object
 *                       nullable: true
 *                       required: [grammarScore, vocabularyScore, fluencyScore, overallScore, detectedCefrLevel, vocabularyLevel, feedback]
 *                       properties:
 *                         grammarScore: { type: integer }
 *                         vocabularyScore: { type: integer }
 *                         fluencyScore: { type: integer }
 *                         overallScore: { type: integer }
 *                         detectedCefrLevel: { type: string }
 *                         vocabularyLevel: { type: string }
 *                         feedback: { type: string }
 *                     remainingMessages: { type: integer, nullable: true, description: FREE messages left today; null = no cap }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Session not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Session already ended, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Invalid body, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       429: { description: Message limit reached — end the call, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post("/calls/:sessionId/turns", authenticate, liveTurnLimiter, saveLiveTurnHandler);

export default router;
