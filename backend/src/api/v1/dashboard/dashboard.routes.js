'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('./dashboard.controller');
const { requireJwtAuth } = require('../../../middleware/auth.middleware');
router.get('/stats', requireJwtAuth, ctrl.getStats);
module.exports = router;
