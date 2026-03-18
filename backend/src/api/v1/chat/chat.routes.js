'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('./chat.controller');
const { requireJwtAuth } = require('../../../../middleware/jwtMiddleware');
const { chatLimiter } = require('../../../../middleware/rateLimiter');

// POST /api/chat
router.post('/', chatLimiter, requireJwtAuth, ctrl.sendMessage);

module.exports = router;
