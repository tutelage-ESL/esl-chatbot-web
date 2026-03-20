'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('./health.controller');
router.get('/', ctrl.check);
module.exports = router;
