import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import { authorize } from "../../middlewares/authorize.ts";
import { createClassListHandler, listClassListsHandler, updateClassListHandler } from "./vocabulary.lists.controller.ts";

// Mounted at /classes: word lists a class's tutors (or admins) assign to its students.
const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ClassWordList:
 *       type: object
 *       required: [id, title, createdAt, createdBy, words, studentCount, practisedPct, masteredPct]
 *       properties:
 *         id: { type: string, format: uuid }
 *         title: { type: string, example: Unit 3 verbs }
 *         createdAt: { type: string, format: date-time }
 *         createdBy:
 *           type: object
 *           nullable: true
 *           required: [id, displayName]
 *           properties:
 *             id: { type: string, format: uuid }
 *             displayName: { type: string }
 *         words:
 *           type: array
 *           items:
 *             type: object
 *             required: [word, definition, example, partOfSpeech]
 *             properties:
 *               word: { type: string }
 *               definition: { type: string }
 *               example: { type: string, nullable: true }
 *               partOfSpeech: { type: string, nullable: true }
 *         studentCount: { type: integer, description: Students who received at least one word of the list }
 *         practisedPct: { type: integer, description: "% of the students' copies reviewed at least once" }
 *         masteredPct: { type: integer, description: "% of the students' copies mastered (level 5)" }
 */

/**
 * @swagger
 * /classes/{classId}/vocabulary-lists:
 *   get:
 *     summary: Word lists assigned to this class, with progress (class tutor or admin)
 *     tags: [Vocabulary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lists, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ClassWordList' }
 *       403: { description: Not a tutor of this class, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Class not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   post:
 *     summary: Assign a word list to students of this class (class tutor or admin)
 *     description: |
 *       `target.mode`: ALL students, ONLY the listed `studentIds`, or everyone EXCEPT them.
 *       Each student gets their own copy of each word (source ASSIGNED). A word a student
 *       already has is skipped so their progress on it is kept. Each student gets one
 *       VOCABULARY_ASSIGNED notification. Not allowed in an archived class.
 *     tags: [Vocabulary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [words, target]
 *             properties:
 *               title: { type: string, maxLength: 80, description: "Optional. Empty = the words are given on their own, without a list name" }
 *               words:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 30
 *                 items:
 *                   type: object
 *                   required: [word, definition]
 *                   properties:
 *                     word: { type: string, maxLength: 100 }
 *                     definition: { type: string, maxLength: 500 }
 *                     example: { type: string, maxLength: 500 }
 *                     partOfSpeech: { type: string, maxLength: 50 }
 *               target:
 *                 type: object
 *                 required: [mode]
 *                 properties:
 *                   mode: { type: string, enum: [ALL, ONLY, EXCEPT] }
 *                   studentIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       201:
 *         description: Words assigned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   required: [id, title, createdAt, wordCount, studentCount, added, skipped]
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     title: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *                     wordCount: { type: integer }
 *                     studentCount: { type: integer }
 *                     added: { type: integer }
 *                     skipped: { type: integer, description: Copies skipped because the student already had the word }
 *       403: { description: Not a tutor of this class, or the class is archived, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Class not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Invalid body or no students chosen, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/:classId/vocabulary-lists", authenticate, authorize("TUTOR", "ADMIN"), listClassListsHandler);
router.post("/:classId/vocabulary-lists", authenticate, authorize("TUTOR", "ADMIN"), createClassListHandler);

/**
 * @swagger
 * /classes/{classId}/vocabulary-lists/{listId}:
 *   patch:
 *     summary: Edit a class word list — rename, fix cards, add words (class tutor or admin)
 *     description: |
 *       `words` are cards to save. A word already in the list updates every student's
 *       copy (meaning, example, part of speech; their progress stays). A new word is given
 *       to the students who have the list, with one notification each. Words left out are
 *       untouched: lists never shrink. Up to 30 words per list. Not allowed in an archived class.
 *     tags: [Vocabulary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: listId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, maxLength: 80 }
 *               words:
 *                 type: array
 *                 maxItems: 30
 *                 items:
 *                   type: object
 *                   required: [word, definition]
 *                   properties:
 *                     word: { type: string, maxLength: 100 }
 *                     definition: { type: string, maxLength: 500 }
 *                     example: { type: string, maxLength: 500 }
 *                     partOfSpeech: { type: string, maxLength: 50 }
 *     responses:
 *       200:
 *         description: The list after the change
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/ClassWordList'
 *                     - type: object
 *                       required: [addedWords]
 *                       properties:
 *                         addedWords: { type: integer, description: New words given to the list's students }
 *       403: { description: Not a tutor of this class, or the class is archived, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Class or list not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Invalid body or more than 30 words, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.patch("/:classId/vocabulary-lists/:listId", authenticate, authorize("TUTOR", "ADMIN"), updateClassListHandler);

export default router;
