'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('./subscription.controller');

// GET  /api/subscription/status
router.get('/status', ctrl.getStatus);
// POST /api/subscription/tier
router.post('/tier', ctrl.updateTier);
// GET  /api/subscription/usage-history
router.get('/usage-history', ctrl.getUsageHistory);
// POST /api/subscription/reset-usage
router.post('/reset-usage', ctrl.resetUsage);

module.exports = router;
