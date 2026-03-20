'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('./conversation.controller');
const { requireJwtAuth } = require('../../../middleware/auth.middleware');
const { chatLimiter } = require('../../../middleware/rateLimiter.middleware');
router.post('/',       requireJwtAuth, chatLimiter, ctrl.sendMessage);
router.get('/history', requireJwtAuth, ctrl.getHistory);
module.exports = router;
