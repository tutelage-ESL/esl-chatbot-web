import { Router } from "express";
import { loginHandler, refreshHandler, logoutHandler } from "./auth.controller.ts";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication — login, token refresh, logout
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with username and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: student_ali
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                           format: email
 *                         displayName:
 *                           type: string
 *                         role:
 *                           type: string
 *                           enum: [STUDENT, TUTOR, ADMIN]
 *                         avatarUrl:
 *                           type: string
 *                           nullable: true
 *                         isActive:
 *                           type: boolean
 *                         subscription:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             plan:
 *                               type: string
 *                               enum: [FREE, PREMIUM]
 *                             status:
 *                               type: string
 *                               enum: [ACTIVE, INACTIVE, CANCELLED, PAST_DUE]
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token (expires in 15 minutes)
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token (expires in 7 days) — store securely
 *       401:
 *         description: Invalid username or password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid username or password
 *                 data:
 *                   nullable: true
 *                   example: null
 *       403:
 *         description: Account deactivated
 *       422:
 *         description: Validation error (missing fields)
 */
router.post("/login", loginHandler);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Obtain a new access token using a valid refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token received at login
 *     responses:
 *       200:
 *         description: New access token issued
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
 *                   example: Access token refreshed
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh", refreshHandler);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate the refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token to revoke
 *     responses:
 *       200:
 *         description: Logged out successfully
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
 *                   example: Logged out successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 */
router.post("/logout", logoutHandler);

export default router;
