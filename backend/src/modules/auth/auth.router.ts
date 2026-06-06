import { Router } from "express";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  loginHandler,
  registerHandler,
  googleAuthHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  linkGoogleHandler,
  setPasswordHandler,
  verifyEmailHandler,
  resendVerificationHandler,
} from "./auth.controller.ts";
import { env } from "../../config/env.ts";
import { authenticate } from "../../middlewares/authenticate.ts";
import {
  loginLimiter,
  registerLimiter,
  googleAuthLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  refreshTokenLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
} from "../../middlewares/rateLimits.ts";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Google OAuth test page (development only) ────────────────────────────────
// Serves a browser page that triggers Google Sign-In and displays the ID token
// so you can copy-paste it into Swagger. Not available in production.
if (env.NODE_ENV !== "production") {
  router.get("/google/test", (_req, res) => {
    const html = readFileSync(join(__dirname, "google-test.html"), "utf-8");
    const clientId = env.GOOGLE_CLIENT_ID ?? "NOT_SET";
    const injected = html.replaceAll("__GOOGLE_CLIENT_ID__", clientId);

    // Override Helmet's strict CSP — Google Sign-In requires its own SDK script,
    // an iframe for the sign-in popup, and inline styles for the button.
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://accounts.google.com",
        "style-src 'self' 'unsafe-inline' https://accounts.google.com",
        "frame-src https://accounts.google.com",
        "connect-src 'self' https://accounts.google.com",
        "img-src 'self' https://*.googleusercontent.com data:",
      ].join("; ")
    );

    // Override Helmet's default Cross-Origin-Opener-Policy (`same-origin`).
    // Google Sign-In opens its consent flow in a popup and posts the credential
    // back to this window via `window.opener`. With `same-origin`, the browser
    // isolates the popup and the callback never fires (popup appears white/blank).
    // `same-origin-allow-popups` keeps the parent protected from cross-origin
    // popups stealing data, while still allowing child popups this page opens
    // to communicate back — exactly what GSI needs.
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

    res.setHeader("Content-Type", "text/html");
    res.send(injected);
  });
}

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication — register, login, Google OAuth, token refresh, logout
 */

// ─── Shared schema snippets ───────────────────────────────────────────────────

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         username:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         displayName:
 *           type: string
 *         role:
 *           type: string
 *           enum: [STUDENT, TUTOR, ADMIN]
 *         avatarUrl:
 *           type: string
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         emailVerified:
 *           type: boolean
 *           description: >
 *             True once the user has verified their email via OTP, or linked a
 *             Google account (Google emails are pre-verified). Verifying activates
 *             the FREE subscription.
 *         subscription:
 *           type: object
 *           nullable: true
 *           description: >
 *             FREE + INACTIVE = no AI access (unverified email, no Google link).
 *             FREE + ACTIVE = AI access (email verified OR Google linked).
 *             PREMIUM + ACTIVE = full AI chatbot access.
 *           properties:
 *             plan:
 *               type: string
 *               enum: [FREE, PREMIUM]
 *             status:
 *               type: string
 *               enum: [ACTIVE, INACTIVE, CANCELLED, PAST_DUE]
 *     AuthTokens:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT access token — expires in 15 minutes. Send as Bearer token in Authorization header.
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token — expires in 7 days. Store securely (httpOnly cookie or secure storage).
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/AuthUser'
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 */

// ─── POST /auth/register ──────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new account with email and password
 *     tags: [Auth]
 *     description: >
 *       Creates a new user account. **No tokens are returned and the user is NOT
 *       logged in** — they must verify their email first. This prevents registering
 *       with an email you don't own and then using the account.
 *
 *       A 6-digit verification code is emailed to the user (best-effort — registration
 *       still succeeds if the email service is unavailable; the code can be re-requested
 *       via `POST /auth/resend-verification`). The user then calls
 *       `POST /auth/verify-email`, which verifies the email AND logs them in (returns tokens).
 *
 *       **State after registration:**
 *       - `subscription.plan` = FREE
 *       - `subscription.status` = INACTIVE
 *       - `emailVerified` = false
 *       - The account **cannot log in** until the email is verified — `POST /auth/login`
 *         returns 403 for unverified accounts.
 *       - Verifying the email (or signing in with Google on the same email) activates
 *         the FREE tier and unlocks AI chatbot access.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - displayName
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 example: student_ali
 *                 description: Unique. Letters, numbers, and underscores only.
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ali@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: MyPassword123
 *               displayName:
 *                 type: string
 *                 maxLength: 100
 *                 example: Ali Hassan
 *     responses:
 *       201:
 *         description: >
 *           Registration successful — account created (unverified). No tokens are
 *           returned; the user must verify their email before they can log in.
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
 *                   example: Registration successful
 *                 data:
 *                   $ref: '#/components/schemas/AuthUser'
 *       409:
 *         description: Username or email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error (missing or invalid fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded (5 registrations per hour per IP)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/register", registerLimiter, registerHandler);

// ─── POST /auth/login ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with username and password
 *     tags: [Auth]
 *     description: >
 *       Standard email/password login. Returns an access token (15m) and a refresh
 *       token (7d). If the account was created with Google Sign-In (no password),
 *       a 400 is returned with a clear message directing the user to Google login.
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
 *                   $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials, or account uses Google Sign-In (no password set)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: >
 *           Account deactivated, OR email not yet verified. Unverified accounts must
 *           complete `POST /auth/verify-email` before they can log in.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error (missing fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded (10 attempts per 15 minutes per IP)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/login", loginLimiter, loginHandler);

// ─── POST /auth/google ────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Sign in or register with Google
 *     tags: [Auth]
 *     description: >
 *       Verifies a Google ID token (obtained from Google Sign-In on the frontend)
 *       and handles all three cases automatically:
 *
 *       **Case 1 — Existing Google user:** logs them in, returns tokens.
 *
 *       **Case 2 — Account merge:** if a user already has an email/password account
 *       with the same email, their Google account is linked automatically and
 *       tokens are returned. They can now sign in with either method.
 *
 *       **Case 3 — New user (needs username):** if no account exists, returns
 *       `{ needsRegistration: true, profile: { email, displayName, avatarUrl } }`.
 *       The frontend should show a username input, then call this endpoint again
 *       with both `idToken` and `username`.
 *
 *       **Case 4 — New user (username provided):** creates the account and returns tokens.
 *
 *       **How to get an ID token on the frontend:**
 *       Use Google's [Sign In With Google](https://developers.google.com/identity/gsi/web/guides/overview)
 *       button or the `@react-oauth/google` / `vue3-google-login` library.
 *       The `credential` field from the Google callback is the `idToken` to send here.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token (JWT) from the frontend Google Sign-In flow
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6...
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 description: Required only for new users (when needsRegistration was true)
 *                 example: john_doe
 *     responses:
 *       200:
 *         description: >
 *           Authentication successful — OR — username required (needsRegistration: true).
 *           Check the `data.needsRegistration` field to distinguish.
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
 *                 data:
 *                   oneOf:
 *                     - description: Authenticated — tokens returned
 *                       type: object
 *                       properties:
 *                         needsRegistration:
 *                           type: boolean
 *                           example: false
 *                         user:
 *                           $ref: '#/components/schemas/AuthUser'
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                     - description: New user — username required
 *                       type: object
 *                       properties:
 *                         needsRegistration:
 *                           type: boolean
 *                           example: true
 *                         profile:
 *                           type: object
 *                           properties:
 *                             googleId:
 *                               type: string
 *                             email:
 *                               type: string
 *                               format: email
 *                             displayName:
 *                               type: string
 *                             avatarUrl:
 *                               type: string
 *                               nullable: true
 *       401:
 *         description: Invalid or expired Google ID token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Username already taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded (20 requests per 15 minutes per IP)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: Google OAuth is not configured on this server (missing GOOGLE_CLIENT_ID)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/google", googleAuthLimiter, googleAuthHandler);

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     description: >
 *       Returns the authenticated user's profile based on the Bearer access token.
 *       The DB is queried on every call so the response reflects current state
 *       (subscription changes, role upgrades, deactivation) rather than stale
 *       claims from the token payload.
 *
 *       Use this on app load / refresh to rehydrate the user session, and as a
 *       lightweight "is my token still valid?" probe.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
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
 *                   example: Current user
 *                 data:
 *                   $ref: '#/components/schemas/AuthUser'
 *       401:
 *         description: Missing, invalid, or expired access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account has been deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User no longer exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/me", authenticate, meHandler);

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

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
 *                 description: The refresh token received at login or registration
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
 *       429:
 *         description: Rate limit exceeded (30 requests per 15 minutes per IP)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/refresh", refreshTokenLimiter, refreshHandler);

// ─── POST /auth/logout ────────────────────────────────────────────────────────

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

// ─── POST /auth/forgot-password ───────────────────────────────────────────────

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP
 *     tags: [Auth]
 *     description: >
 *       Sends a 6-digit OTP to the user's registered email address. The OTP expires
 *       in 15 minutes. Any previous unused OTP for that account is invalidated.
 *
 *       **Always returns 200** — the response does not reveal whether the email is
 *       registered, to prevent account enumeration.
 *
 *       If the account was created with Google Sign-In (no password), a helpful
 *       email is sent directing the user to use Google login instead.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ali@tutelage.com
 *     responses:
 *       200:
 *         description: OTP sent (or email not found — same response either way)
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
 *                   example: If that email is registered, you will receive a reset code shortly
 *                 data:
 *                   nullable: true
 *                   example: null
 *       422:
 *         description: Validation error (invalid email format)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded (5 requests per hour per IP)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: Email service not configured on this server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/forgot-password", forgotPasswordLimiter, forgotPasswordHandler);

// ─── POST /auth/reset-password ────────────────────────────────────────────────

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     description: >
 *       Verifies the OTP sent to the user's email and sets a new password.
 *       The OTP is single-use and expires after 15 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ali@tutelage.com
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 pattern: '^\d{6}$'
 *                 example: "482910"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
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
 *                   example: Password reset successfully. You can now log in with your new password.
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Invalid, expired, or already-used OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded (10 attempts per 15 minutes per IP)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/reset-password", resetPasswordLimiter, resetPasswordHandler);

// ─── POST /auth/verify-email ──────────────────────────────────────────────────

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify email with the OTP, activate the free plan, and log in
 *     tags: [Auth]
 *     description: >
 *       Verifies the 6-digit code emailed at registration. On success, the user's
 *       email is marked verified, their FREE subscription is activated
 *       (`INACTIVE → ACTIVE`, unlocking AI chatbot access), and **a token pair is
 *       returned so the user is logged in immediately** — this is the first point a
 *       LOCAL account receives tokens (register no longer issues them). A paid plan
 *       is never downgraded by this call.
 *
 *       Unauthenticated by design so the code can be entered from any device — the
 *       valid OTP is the proof of email ownership. If the email is already verified,
 *       returns 409 (the user should sign in normally); tokens are only minted on a
 *       fresh verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ali@tutelage.com
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 pattern: '^\d{6}$'
 *                 example: "482910"
 *     responses:
 *       200:
 *         description: Email verified — free plan active, user logged in (tokens returned)
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
 *                   example: Email verified successfully. Your free plan is now active.
 *                 data:
 *                   $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid, expired, or already-used verification code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already verified — sign in normally
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error (invalid email or OTP format)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded (10 attempts per 15 minutes per IP)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/verify-email", verifyEmailLimiter, verifyEmailHandler);

// ─── POST /auth/resend-verification ───────────────────────────────────────────

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Resend the email verification code
 *     tags: [Auth]
 *     description: >
 *       Sends a fresh 6-digit verification code to the email, invalidating any
 *       previous unused code. The code expires in 24 hours.
 *
 *       **Always returns 200** — the response does not reveal whether the email is
 *       registered or already verified, to prevent account enumeration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ali@tutelage.com
 *     responses:
 *       200:
 *         description: Code sent (or email not found / already verified — same response either way)
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
 *                   example: If that email is registered and not yet verified, a new verification code has been sent.
 *                 data:
 *                   nullable: true
 *                   example: null
 *       422:
 *         description: Validation error (invalid email format)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded (5 requests per hour per IP)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: Email service not configured on this server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/resend-verification", resendVerificationLimiter, resendVerificationHandler);

// ─── POST /auth/link-google ───────────────────────────────────────────────────

/**
 * @swagger
 * /auth/link-google:
 *   post:
 *     summary: Link a Google account to the authenticated user
 *     tags: [Auth]
 *     description: >
 *       Links the user's Google account to their existing profile. After linking,
 *       they can sign in with either their password or Google Sign-In.
 *
 *       Required for accessing AI chatbot and subscription features. If the user
 *       already has a different avatar, it is preserved; Google's avatar is only
 *       applied if no avatar exists yet.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token from the frontend Google Sign-In flow
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6...
 *     responses:
 *       200:
 *         description: Google account linked successfully — returns updated user profile
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
 *                   example: Google account linked successfully
 *                 data:
 *                   $ref: '#/components/schemas/AuthUser'
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Google account already linked (to this or another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: Google OAuth not configured on this server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/link-google", authenticate, linkGoogleHandler);

// ─── POST /auth/set-password ──────────────────────────────────────────────────

/**
 * @swagger
 * /auth/set-password:
 *   post:
 *     summary: Set a password for a Google-only account
 *     tags: [Auth]
 *     description: >
 *       Allows users who registered via Google Sign-In (and therefore have no
 *       password) to set one. After setting a password, they can log in with
 *       either their email/password or Google.
 *
 *       **Recommended but not required** — the user can dismiss the prompt and
 *       continue using Google Sign-In only.
 *
 *       Returns 409 if the account already has a password set (use the
 *       forgot-password flow to change an existing password).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: MyNewPassword123
 *     responses:
 *       200:
 *         description: Password set successfully
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
 *                   example: Password set successfully. You can now log in with your email and password.
 *                 data:
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Account already has a password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/set-password", authenticate, setPasswordHandler);

export default router;
