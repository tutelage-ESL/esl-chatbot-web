import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.ts";
import { authorize } from "../../middlewares/authorize.ts";
import { patchUser, putSubscription, deleteSubscription } from "./admin.controller.ts";

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
 *       422:
 *         description: Validation error — at least one field required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
 *                 description: Subscription tier to assign
 *               durationMonths:
 *                 type: integer
 *                 enum: [1, 3, 6, 12]
 *                 description: Duration in months (from today)
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Custom end date — must be in the future (ISO 8601)
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
 *                     currentPeriodEnd:
 *                       type: string
 *                       format: date-time
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
 *     description: Sets the subscription status to CANCELLED. Dates are preserved for audit purposes.
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

export default router;
