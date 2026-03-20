'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('./pronunciation.controller');
const { requireJwtAuth } = require('../../../middleware/auth.middleware');
router.post('/analyze', requireJwtAuth, ctrl.analyze);
module.exports = router;
