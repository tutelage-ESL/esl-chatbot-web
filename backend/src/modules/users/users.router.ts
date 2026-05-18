import { Router } from "express";
import {
  listUsers,
  getUser,
  getDashboardHandler,
  getMe,
  updateMe,
  updateLearnerProfile,
} from "./users.controller.ts";
import { authenticate } from "../../middlewares/authenticate.ts";
import { authorize } from "../../middlewares/authorize.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and management
 */

// ─── Self-profile routes (any authenticated user) ─────────────────────────────

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get own profile (full, including learner settings)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Own profile with learner settings and subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/MyProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
/**
 * @swagger
 * /users/me/dashboard:
 *   get:
 *     summary: Get aggregated dashboard data for the authenticated user
 *     description: |
 *       Returns all data needed to render the student dashboard in a single request,
 *       avoiding 5+ separate API calls on page load.
 *
 *       Includes:
 *       - **todayProgress** — today's session count, study minutes, messages, words typed, vocab practiced, goals advanced
 *       - **metrics** — lifetime skill scores (grammar/vocab/fluency/speaking), current streak, total study time, estimated CEFR level
 *       - **activeGoalsCount** — number of goals with status ACTIVE
 *       - **vocabDueTodayCount** — SRS cards due for review today
 *       - **lastSession** — most recent session with its evaluation summary (null if no sessions yet)
 *
 *       This endpoint is safe to call for any role. All values default to zero when no data exists yet.
 *     tags: [Users]
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
 *                     todayProgress:
 *                       type: object
 *                       properties:
 *                         sessionsCount: { type: integer }
 *                         studyMinutes: { type: integer }
 *                         messagesCount: { type: integer }
 *                         wordsTyped: { type: integer }
 *                         vocabularyPracticed: { type: integer }
 *                         goalsAdvanced: { type: integer }
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         currentStreak: { type: integer }
 *                         longestStreak: { type: integer }
 *                         totalStudyTimeMinutes: { type: integer }
 *                         estimatedLevel: { type: string, nullable: true }
 *                         grammarSkill: { type: number }
 *                         vocabularySkill: { type: number }
 *                         fluencySkill: { type: number }
 *                         speakingSkill: { type: number }
 *                     activeGoalsCount: { type: integer }
 *                     vocabDueTodayCount: { type: integer }
 *                     lastSession:
 *                       nullable: true
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         topic: { type: string, nullable: true }
 *                         endedAt: { type: string, format: date-time, nullable: true }
 *                         durationSeconds: { type: integer, nullable: true }
 *                         evaluation:
 *                           nullable: true
 *                           type: object
 *                           properties:
 *                             avgOverallScore: { type: number }
 *                             detectedCefrLevel: { type: string }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/me/dashboard", authenticate, getDashboardHandler);

router.get("/me", authenticate, getMe);

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update own basic profile (displayName, phoneNumber, avatarUrl)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 20
 *                 nullable: true
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MyProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.patch("/me", authenticate, updateMe);

/**
 * @swagger
 * /users/me/learner-profile:
 *   patch:
 *     summary: Update learner settings (levels, topics, AI preferences, app settings)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentLevel:
 *                 type: string
 *                 enum: [A1, A2, B1, B2, C1, C2]
 *                 nullable: true
 *               targetLevel:
 *                 type: string
 *                 enum: [A1, A2, B1, B2, C1, C2]
 *                 nullable: true
 *               learningPurpose:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *               topicsOfInterest:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *               aiPersonality:
 *                 type: string
 *                 enum: [FRIENDLY, FORMAL, CASUAL, ENCOURAGING, STRICT, PATIENT]
 *                 nullable: true
 *               voiceSpeed:
 *                 type: number
 *                 minimum: 0.5
 *                 maximum: 2.0
 *               autoSpeak:
 *                 type: boolean
 *               uiLanguage:
 *                 type: string
 *                 example: en
 *               theme:
 *                 type: string
 *                 enum: [light, dark]
 *               weeklyGoalMinutes:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 840
 *               timezone:
 *                 type: string
 *                 example: Asia/Baghdad
 *     responses:
 *       200:
 *         description: Updated learner profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LearnerProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.patch("/me/learner-profile", authenticate, updateLearnerProfile);

// ─── Admin-only routes ────────────────────────────────────────────────────────

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users (paginated) — Admin only
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [STUDENT, TUTOR, ADMIN]
 *         description: Filter by role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username, email, or display name (case-insensitive)
 *       - in: query
 *         name: subscriptionStatus
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, CANCELLED, PAST_DUE]
 *         description: Filter by subscription status
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                         nullable: true
 *                       isActive:
 *                         type: boolean
 *                       role:
 *                         type: string
 *                         enum: [STUDENT, TUTOR, ADMIN]
 *                       phoneNumber:
 *                         type: string
 *                         nullable: true
 *                       subscription:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           plan:
 *                             type: string
 *                             enum: [FREE, GOLD, PREMIUM]
 *                           status:
 *                             type: string
 *                             enum: [ACTIVE, INACTIVE, CANCELLED, PAST_DUE]
 *                           currentPeriodEnd:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authenticate, authorize("ADMIN"), listUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a single user by ID (full profile) — Admin only
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User UUID
 *     responses:
 *       200:
 *         description: Full user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                     role:
 *                       type: string
 *                       enum: [STUDENT, TUTOR, ADMIN]
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     learnerProfile:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         currentLevel:
 *                           type: string
 *                           nullable: true
 *                         targetLevel:
 *                           type: string
 *                           nullable: true
 *                         learningPurpose:
 *                           type: string
 *                           nullable: true
 *                         weeklyGoalMinutes:
 *                           type: integer
 *                         timezone:
 *                           type: string
 *                         uiLanguage:
 *                           type: string
 *                         theme:
 *                           type: string
 *                     subscription:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         plan:
 *                           type: string
 *                           enum: [FREE, GOLD, PREMIUM]
 *                         status:
 *                           type: string
 *                           enum: [ACTIVE, INACTIVE, CANCELLED, PAST_DUE]
 *                         currentPeriodStart:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         currentPeriodEnd:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                     metrics:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         totalStudyTimeMinutes:
 *                           type: integer
 *                         totalWordsTyped:
 *                           type: integer
 *                         currentStreak:
 *                           type: integer
 *                         longestStreak:
 *                           type: integer
 *                         lastStudyDate:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         estimatedLevel:
 *                           type: string
 *                           nullable: true
 *                         grammarSkill:
 *                           type: number
 *                         vocabularySkill:
 *                           type: number
 *                         fluencySkill:
 *                           type: number
 *                         speakingSkill:
 *                           type: number
 *                     classUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           role:
 *                             type: string
 *                             enum: [STUDENT, TUTOR, ADMIN]
 *                           class:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               className:
 *                                 type: string
 *                               classCode:
 *                                 type: string
 *                               classStatus:
 *                                 type: string
 *                                 enum: [ACTIVE, INACTIVE]
 *       400:
 *         description: Invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", authenticate, authorize("ADMIN"), getUser);

export default router;
