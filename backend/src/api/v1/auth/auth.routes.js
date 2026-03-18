'use strict';

const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const sessionCtrl = require('./auth.controller').session;
const jwtCtrl     = require('./auth.controller').jwt;
const { requireJwtAuth } = require('../../../../middleware/jwtMiddleware');

// ─── Session-based auth (/api/auth/...) ───────────────────────────────────────
router.post('/signup',
  [
    check('username', 'Username is required').notEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  sessionCtrl.signup
);

router.post('/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').notEmpty(),
  ],
  sessionCtrl.login
);

router.post('/logout', sessionCtrl.logout);
router.get('/status', sessionCtrl.getStatus);

// ─── JWT-based auth (/api/auth/jwt/...) ───────────────────────────────────────
router.post('/jwt/signup',
  [
    check('username', 'Username is required').notEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  ],
  jwtCtrl.signup
);

router.post('/jwt/signin',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').notEmpty(),
  ],
  jwtCtrl.signin
);

router.post('/jwt/refresh', jwtCtrl.refresh);
router.post('/jwt/logout',  jwtCtrl.logout);
router.get('/jwt/me',      requireJwtAuth, jwtCtrl.getProfile);
router.get('/jwt/profile', requireJwtAuth, jwtCtrl.getProfile);

module.exports = router;
