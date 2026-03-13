// =============================================================================
// LEGACY AUTH ROUTES — FOR REFERENCE ONLY
// =============================================================================
// Session-based auth with EJS redirects (login → /dashboard).
// Used only by server-legacy.js. The active server uses sessionAuthRoutes.js
// and jwtAuthRoutes.js instead.
// =============================================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { check } = require('express-validator');

router.post('/signup',
  [check('username', 'Username is required').notEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })],
  authController.signup
);
router.post('/login',
  [check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').notEmpty()],
  authController.login
);
router.get('/logout', authController.logout);


module.exports = router;