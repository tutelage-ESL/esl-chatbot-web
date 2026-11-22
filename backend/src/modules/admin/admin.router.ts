import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import { authorize } from "../../middlewares/authorize.ts";
import { patchUser, putSubscription, deleteSubscription, getDashboardHandler, adminPatchProfileHandler, adminUploadAvatarHandler, adminPatchLearnerProfileHandler } from "./admin.controller.ts";
import { avatarUpload } from "../../middlewares/upload.ts";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only user and subscription management
 */

/**
 * @swagger
 * /admin/users/{id}:
 *   patch:
 *     summary: Update a user's role and/or active status — Admin only
 *     tags: [Admin]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [STUDENT, TUTOR, ADMIN]
 *                 description: New role for the user
 *               isActive:
 *                 type: boolean
 *                 description: Set to false to deactivate (soft ban), true to re-activate
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                   example: User updated successfully
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
 *                     role:
 *                       type: string
 *                       enum: [STUDENT, TUTOR, ADMIN]
 *                     isActive:
 *                       type: boolean
 *                     subscription:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         plan:
 *                           type: string
 *                           enum: [FREE, GOLD, PREMIUM]
 *                         status:
 *                           type: string
 *                           enum: [ACTIVE, INACTIVE, CANCELLED, PAST_DUE]
 *                         currentPeriodEnd:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
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
 *       409:
 *         description: |
 *           Blocked to prevent lockout — the admin tried to change their own role or
 *           deactivate their own account, or the change would remove the last active admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error — at least one field required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Admin home dashboard (Admin only)
 *     description: |
 *       Growth (rolling 7 days vs the 7 before), the student funnel, plans (paid ones only
 *       while their period hasn't ended), FIB revenue from subscriptions activated this
 *       month, subscriptions ending in the next 7 days, AI messages by plan, and things that
 *       need attention. Internal accounts never count.
 *     tags: [Admin]
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
 *                     users:
 *                       type: object
 *                       properties:
 *                         total: { type: integer }
 *                         students: { type: integer }
 *                         tutors: { type: integer }
 *                         admins: { type: integer }
 *                         newThisWeek: { type: integer }
 *                         newLastWeek: { type: integer }
 *                     activity:
 *                       type: object
 *                       properties:
 *                         active24h: { type: integer }
 *                         activeThisWeek: { type: integer }
 *                         activeLastWeek: { type: integer }
 *                         messagesThisWeek: { type: integer }
 *                         messagesLastWeek: { type: integer }
 *                     funnel:
 *                       type: object
 *                       properties:
 *                         signedUp: { type: integer }
 *                         verified: { type: integer }
 *                         practised: { type: integer }
 *                         paying: { type: integer }
 *                     plans:
 *                       type: object
 *                       properties:
 *                         FREE: { type: integer }
 *                         GOLD: { type: integer }
 *                         PREMIUM: { type: integer }
 *                         expiredNotDowngraded: { type: integer }
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         fibThisMonthIQD: { type: integer }
 *                         fibThisMonthCount: { type: integer }
 *                         fibLastMonthIQD: { type: integer }
 *                         payingByProvider: { type: object, additionalProperties: { type: integer } }
 *                     expiringSoon:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId: { type: string, format: uuid }
 *                           name: { type: string }
 *                           plan: { type: string, enum: [FREE, GOLD, PREMIUM] }
 *                           endsAt: { type: string, format: date-time }
 *                           cancelling: { type: boolean }
 *                     aiUsage:
 *                       type: object
 *                       properties:
 *                         FREE: { type: integer }
 *                         GOLD: { type: integer }
 *                         PREMIUM: { type: integer }
 *                     attention:
 *                       type: object
 *                       properties:
 *                         unverifiedOver24h: { type: integer }
 *                         fibPaymentsStuck: { type: integer }
 *                     people:
 *                       type: object
 *                       properties:
 *                         newest:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               name: { type: string }
 *                               username: { type: string }
 *                               role: { type: string, enum: [STUDENT, TUTOR, ADMIN] }
 *                               verified: { type: boolean }
 *                               plan: { type: string, enum: [FREE, GOLD, PREMIUM] }
 *                               joinedAt: { type: string, format: date-time }
 *                         mostActive:
 *                           type: array
 *                           description: Students with the most practice minutes in the last 7 days
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               name: { type: string }
 *                               minutes: { type: integer }
 *                               messages: { type: integer }
 *                               plan: { type: string, enum: [FREE, GOLD, PREMIUM] }
 *                         goneQuiet:
 *                           type: array
 *                           description: Students who practised before but not in the last 7 days, most recently quiet first
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               name: { type: string }
 *                               lastPracticeAt: { type: string, format: date-time }
 *                               plan: { type: string, enum: [FREE, GOLD, PREMIUM] }
 *                         goneQuietCount: { type: integer }
 *                     classes:
 *                       type: array
 *                       description: Every class that isn't archived, biggest first (same numbers as the tutor dashboard)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           name: { type: string }
 *                           students: { type: integer }
 *                           activeThisWeek: { type: integer }
 *                           handInRate: { type: integer, nullable: true }
 *                           missing: { type: integer }
 *                           toReview: { type: integer }
 *                           avgSkill: { type: integer, nullable: true }
 *                           teacher:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               name: { type: string }
 *                     trend:
 *                       type: array
 *                       description: The last 30 UTC days, oldest first
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string, example: "2026-11-21" }
 *                           signUps: { type: integer }
 *                           activeLearners: { type: integer }
 *                           messages: { type: integer }
 *                     learning:
 *                       type: object
 *                       properties:
 *                         skills:
 *                           type: object
 *                           properties:
 *                             grammar: { type: number }
 *                             vocabulary: { type: number }
 *                             fluency: { type: number }
 *                             speaking: { type: number }
 *                             practisingStudents: { type: integer }
 *                         levels:
 *                           type: object
 *                           description: Students by the level the AI hears; NONE = not measured yet
 *                           additionalProperties: { type: integer }
 *                         commonMistakes:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               rule: { type: string }
 *                               count: { type: integer }
 *                               example:
 *                                 type: object
 *                                 nullable: true
 *                                 properties:
 *                                   said: { type: string }
 *                                   better: { type: string }
 *                         modes:
 *                           type: object
 *                           properties:
 *                             chat: { type: integer }
 *                             voice: { type: integer }
 *                             voiceMinutes: { type: integer }
 *                         heavyUsers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               name: { type: string }
 *                               messages: { type: integer }
 *                               plan: { type: string, enum: [FREE, GOLD, PREMIUM] }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Caller is not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/dashboard", getDashboardHandler);

router.patch("/users/:id", patchUser);

/**
 * @swagger
 * /admin/users/{id}/subscription:
 *   put:
 *     summary: Assign or update a subscription for a user — Admin only
 *     description: >
 *       Sets the user's subscription to ACTIVE with the chosen plan.
 *       Provide either `durationMonths` (1, 3, 6, or 12) for a standard period,
 *       or a custom `endDate` (ISO datetime) for a non-standard deal.
 *       Existing subscriptions are overwritten. `currentPeriodStart` is always set to now.
 *     tags: [Admin]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [FREE, GOLD, PREMIUM]
 *                 description: Subscription tier to assign. FREE is permanent (no period dates required).
 *               durationMonths:
 *                 type: integer
 *                 enum: [1, 3, 6, 12]
 *                 description: Duration in months (from today). Required for GOLD/PREMIUM unless endDate is provided.
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Custom end date — must be in the future (ISO 8601). Required for GOLD/PREMIUM unless durationMonths is provided.
 *               paymentProvider:
 *                 type: string
 *                 enum: [CASH, FIB, STRIPE]
 *                 description: Payment method used. Defaults to CASH (admin manual assignment for institute cash payments).
 *     responses:
 *       200:
 *         description: Subscription assigned successfully
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
 *                   example: Subscription assigned successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     plan:
 *                       type: string
 *                       enum: [FREE, GOLD, PREMIUM]
 *                     status:
 *                       type: string
 *                       enum: [ACTIVE, INACTIVE, CANCELLED, PAST_DUE]
 *                     currentPeriodStart:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     currentPeriodEnd:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     paymentProvider:
 *                       type: string
 *                       enum: [CASH, FIB, STRIPE]
 *                       nullable: true
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
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
 *       422:
 *         description: Validation error — plan required; provide durationMonths or endDate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Cancel a user's subscription — Admin only
 *     description: >
 *       Downgrades the user to FREE — ACTIVE (AI at FREE limits) if their email is verified, otherwise INACTIVE until they verify.
 *       To block all access, use PATCH /admin/users/:id with isActive=false instead.
 *     tags: [Admin]
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
 *         description: Subscription cancelled successfully
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
 *                   example: Subscription cancelled successfully
 *                 data:
 *                   nullable: true
 *                   example: null
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
 *         description: User not found or has no subscription
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/users/:id/subscription", putSubscription);
router.delete("/users/:id/subscription", deleteSubscription);

// ── Admin user profile & learner profile editing ──────────────────────────────
router.patch("/users/:id/profile", adminPatchProfileHandler);
router.post("/users/:id/avatar", avatarUpload.single("avatar"), adminUploadAvatarHandler);
router.patch("/users/:id/learner-profile", adminPatchLearnerProfileHandler);

export default router;
