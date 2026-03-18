'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('./health.controller');

// GET /api/health
router.get('/health', ctrl.health);

module.exports = router;
