'use strict';
const express = require('express');
const router = express.Router();
router.use('/health', require('./health/health.routes'));
router.use('/status', require('./status/status.routes'));
module.exports = router;
