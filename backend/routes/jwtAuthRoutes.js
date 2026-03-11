// ============================================================================
// JWT Auth Routes
// Mounts under /api/auth/jwt in app-api.js
//
//   POST /api/auth/jwt/signup   → Create account & receive tokens
//   POST /api/auth/jwt/signin   → Authenticate & receive tokens
//   POST /api/auth/jwt/refresh  → Rotate tokens (access + refresh)
//   POST /api/auth/jwt/logout   → Invalidate refresh token
//   GET  /api/auth/jwt/profile  → Protected route – returns user info
// ============================================================================

const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const jwtAuthController = require('../controllers/jwtAuthController');
const { requireJwtAuth } = require('../middleware/jwtMiddleware');

// ── Sign up ──────────────────────────────────────────────────────────────────
router.post(
  '/signup',
  [
    check('username', 'Username is required').notEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  ],
  jwtAuthController.signup
);

// ── Sign in ──────────────────────────────────────────────────────────────────
router.post(
  '/signin',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').notEmpty(),
  ],
  jwtAuthController.signin
);

// ── Refresh tokens ───────────────────────────────────────────────────────────
router.post('/refresh', jwtAuthController.refresh);

// ── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', jwtAuthController.logout);

// ── Profile (protected example route) ────────────────────────────────────────
router.get('/profile', requireJwtAuth, jwtAuthController.getProfile);

module.exports = router;
