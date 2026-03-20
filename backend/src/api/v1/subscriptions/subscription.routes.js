'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('./subscription.controller');
const { requireJwtAuth } = require('../../../middleware/auth.middleware');
router.get('/status', requireJwtAuth, ctrl.getStatus);
router.post('/plan',  requireJwtAuth, ctrl.changePlan);
module.exports = router;
