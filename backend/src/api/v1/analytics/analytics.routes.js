'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('./analytics.controller');
const { requireJwtAuth } = require('../../../middleware/auth.middleware');
router.get('/progress', requireJwtAuth, ctrl.getProgress);
module.exports = router;
