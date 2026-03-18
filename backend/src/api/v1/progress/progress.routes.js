'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('./progress.controller');
const { requireJwtAuth } = require('../../../../middleware/jwtMiddleware');

// GET /api/progress
router.get('/', requireJwtAuth, ctrl.getProgress);

module.exports = router;
