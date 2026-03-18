'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('./settings.controller');

const upload = multer({ dest: 'uploads/' });

// GET  /api/settings/:userId
router.get('/:userId', ctrl.getSettings);
// POST /api/settings
router.post('/', ctrl.updateSettings);
// POST /api/settings/upload
router.post('/upload', upload.single('file'), ctrl.uploadFile);

module.exports = router;
