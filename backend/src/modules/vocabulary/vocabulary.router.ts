import { Router } from "express";
import {
  getVocabularyStatsHandler,
  listVocabularyHandler,
  getDueCardsHandler,
  addVocabularyHandler,
  getVocabularyByIdHandler,
  updateVocabularyHandler,
  deleteVocabularyHandler,
  reviewVocabularyHandler,
} from "./vocabulary.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Vocabulary
 *   description: Personal vocabulary list with SM-2 spaced repetition (SRS)
 */

/**
 * @swagger
 * /vocabulary/stats:
 *   get:
 *     summary: Get vocabulary statistics summary
 *     description: |
 *       Returns aggregate stats about the authenticated user's vocabulary:
 *       total word count, how many cards are due for SRS review today, how many
 *       words were added in the last 7 days, and a breakdown by mastery level
 *       (new → seen → learning → familiar → proficient → mastered).
 *     tags: [Vocabulary]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vocabulary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total: { type: integer, description: Total words in vocabulary }
 *                     dueToday: { type: integer, description: SRS cards due for review today }
 *                     learnedThisWeek: { type: integer, description: Words added in the last 7 days }
 *                     byMasteryLevel:
 *                       type: object
 *                       properties:
 *                         new: { type: integer, description: "masteryLevel 0 — never reviewed" }
 *                         seen: { type: integer, description: "masteryLevel 1 — reviewed once (≤1 day interval)" }
 *                         learning: { type: integer, description: "masteryLevel 2 — in progress (≤3 day interval)" }
 *                         familiar: { type: integer, description: "masteryLevel 3 — familiar (≤7 day interval)" }
 *                         proficient: { type: integer, description: "masteryLevel 4 — proficient (≤21 day interval)" }
 *                         mastered: { type: integer, description: "masteryLevel 5 — mastered (>21 day interval)" }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/stats", authenticate, getVocabularyStatsHandler);

/**
 * @swagger
 * /vocabulary:
 *   get:
 *     summary: List vocabulary
 *     description: Returns the authenticated user's vocabulary list. Filter by due status, source, category, or keyword search.
 *     tags: [Vocabulary]
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
 *         name: due
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter cards due today (true) or not yet due (false)
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [MANUAL, SESSION]
 *         description: Filter by how the word was added
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (case-insensitive partial match)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search word or definition (case-insensitive)
 *     responses:
 *       200:
 *         description: Paginated vocabulary list
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
 *                     $ref: '#/components/schemas/VocabularyItem'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", authenticate, listVocabularyHandler);

/**
 * @swagger
 * /vocabulary/due:
 *   get:
 *     summary: Get cards due for SRS review today
 *     description: Returns up to 50 vocabulary cards whose `srsDue` is today or earlier, ordered by most overdue first.
 *     tags: [Vocabulary]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of due cards
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
 *                     $ref: '#/components/schemas/VocabularyItem'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/due", authenticate, getDueCardsHandler);

/**
 * @swagger
 * /vocabulary:
 *   post:
 *     summary: Add a word to vocabulary
 *     description: Manually add a new word. Words are stored in lowercase. Returns 409 if the word already exists in the user's list.
 *     tags: [Vocabulary]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [word, definition]
 *             properties:
 *               word:
 *                 type: string
 *                 maxLength: 100
 *               definition:
 *                 type: string
 *                 maxLength: 500
 *               pronunciation:
 *                 type: string
 *                 maxLength: 200
 *               example:
 *                 type: string
 *                 maxLength: 500
 *               partOfSpeech:
 *                 type: string
 *                 maxLength: 50
 *                 description: "e.g. noun, verb, adjective"
 *               difficulty:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 default: 1
 *               category:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       201:
 *         description: Word added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VocabularyItem'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Word already in vocabulary
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post("/", authenticate, addVocabularyHandler);

/**
 * @swagger
 * /vocabulary/{id}:
 *   get:
 *     summary: Get a vocabulary item
 *     tags: [Vocabulary]
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
 *         description: Vocabulary item
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VocabularyItem'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", authenticate, getVocabularyByIdHandler);

/**
 * @swagger
 * /vocabulary/{id}:
 *   patch:
 *     summary: Update a vocabulary item
 *     description: Update editable fields (definition, pronunciation, example, partOfSpeech, difficulty, category). SRS fields are managed via the review endpoint.
 *     tags: [Vocabulary]
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
 *               definition:
 *                 type: string
 *                 maxLength: 500
 *               pronunciation:
 *                 type: string
 *                 maxLength: 200
 *                 nullable: true
 *               example:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *               partOfSpeech:
 *                 type: string
 *                 maxLength: 50
 *                 nullable: true
 *               difficulty:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               category:
 *                 type: string
 *                 maxLength: 100
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated vocabulary item
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VocabularyItem'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.patch("/:id", authenticate, updateVocabularyHandler);

/**
 * @swagger
 * /vocabulary/{id}:
 *   delete:
 *     summary: Delete a vocabulary item
 *     tags: [Vocabulary]
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
 *         description: Word deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", authenticate, deleteVocabularyHandler);

/**
 * @swagger
 * /vocabulary/{id}/review:
 *   post:
 *     summary: Submit an SRS review for a word
 *     description: |
 *       Submit a quality rating (0–5) for a vocabulary card. The SM-2 algorithm
 *       updates the next review interval and ease factor.
 *
 *       Quality scale:
 *       - **0**: Complete blackout (wrong, very hard)
 *       - **1**: Wrong but familiar
 *       - **2**: Wrong but easy hint was enough
 *       - **3**: Correct with difficulty
 *       - **4**: Correct with hesitation
 *       - **5**: Perfect recall
 *
 *       Ratings 0–2 reset the interval to 1 day. Ratings 3–5 advance the schedule.
 *       Also increments today's `vocabularyPracticed` in the progress table.
 *     tags: [Vocabulary]
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
 *             required: [quality]
 *             properties:
 *               quality:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Review recorded — returns updated SRS fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ReviewResult'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post("/:id/review", authenticate, reviewVocabularyHandler);

/**
 * @swagger
 * components:
 *   schemas:
 *     VocabularyItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         word:
 *           type: string
 *         definition:
 *           type: string
 *         pronunciation:
 *           type: string
 *           nullable: true
 *         example:
 *           type: string
 *           nullable: true
 *         partOfSpeech:
 *           type: string
 *           nullable: true
 *         difficulty:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         category:
 *           type: string
 *           nullable: true
 *         source:
 *           type: string
 *           enum: [MANUAL, SESSION]
 *           description: How the word was added — MANUAL by user, SESSION auto-detected by AI
 *         srsInterval:
 *           type: integer
 *           description: Days until next review
 *         srsDue:
 *           type: string
 *           format: date-time
 *           description: When this card is next due for review
 *         srsEase:
 *           type: number
 *           description: SM-2 ease factor (1.3–2.5)
 *         reviewCount:
 *           type: integer
 *         correctCount:
 *           type: integer
 *         incorrectCount:
 *           type: integer
 *         masteryLevel:
 *           type: integer
 *           minimum: 0
 *           maximum: 5
 *           description: "0=new, 1=seen(1 day), 2=learning(≤3d), 3=familiar(≤7d), 4=proficient(≤21d), 5=mastered(>21d)"
 *         lastPracticed:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ReviewResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         word:
 *           type: string
 *         srsInterval:
 *           type: integer
 *         srsDue:
 *           type: string
 *           format: date-time
 *         srsEase:
 *           type: number
 *         masteryLevel:
 *           type: integer
 *         reviewCount:
 *           type: integer
 *         correctCount:
 *           type: integer
 *         incorrectCount:
 *           type: integer
 *         lastPracticed:
 *           type: string
 *           format: date-time
 */

export default router;
