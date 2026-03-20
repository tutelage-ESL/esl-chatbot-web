'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('./learnerProfile.controller');
const { requireJwtAuth } = require('../../../middleware/auth.middleware');
router.get('/',  requireJwtAuth, ctrl.getProfile);
router.put('/',  requireJwtAuth, ctrl.updateProfile);
module.exports = router;
