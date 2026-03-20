'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('./status.controller');
router.get('/', ctrl.getStatus);
router.get('/ping', ctrl.ping);
module.exports = router;
