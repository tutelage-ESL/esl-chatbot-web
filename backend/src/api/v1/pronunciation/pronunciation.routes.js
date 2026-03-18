'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('./pronunciation.controller');

const upload = multer({ dest: 'uploads/' });

// POST /api/pronunciation/analyze
router.post('/analyze', upload.single('audio'), ctrl.analyze);

module.exports = router;
