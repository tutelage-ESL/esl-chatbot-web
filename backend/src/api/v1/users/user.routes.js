'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('./user.controller');
const { requireJwtAuth } = require('../../../middleware/auth.middleware');
const { requireTutor } = require('../../../middleware/rbac.middleware');

router.get('/me',         requireJwtAuth, ctrl.getMyProfile);
router.put('/me',         requireJwtAuth, ctrl.updateMyProfile);
router.get('/students',   requireJwtAuth, requireTutor, ctrl.getMyStudents);

module.exports = router;
