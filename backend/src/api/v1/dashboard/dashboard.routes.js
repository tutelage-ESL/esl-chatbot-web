'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('./dashboard.controller');
const { requireJwtAuth } = require('../../../../middleware/jwtMiddleware');

// GET /api/dashboard/stats
router.get('/stats', requireJwtAuth, ctrl.getStats);
// GET /api/dashboard/usage  (also aliased from /api/usage)
router.get('/usage', requireJwtAuth, ctrl.getUsage);

module.exports = router;
