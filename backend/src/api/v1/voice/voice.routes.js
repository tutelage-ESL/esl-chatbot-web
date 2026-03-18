'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('./voice.controller');
const { requireJwtAuth } = require('../../../../middleware/jwtMiddleware');

// GET  /api/voice/voices
router.get('/voices', ctrl.getVoices);
// POST /api/voice/text-to-speech
router.post('/text-to-speech', ctrl.textToSpeech);
// POST /api/voice/text-to-speech-stream
router.post('/text-to-speech-stream', ctrl.textToSpeechStream);
// GET  /api/voice/voice-status
router.get('/voice-status', ctrl.voiceStatus);
// POST /api/voice/free-tts
router.post('/free-tts', ctrl.freeTts);
// POST /api/voice/voice-message
router.post('/voice-message', requireJwtAuth, ctrl.voiceMessage);

module.exports = router;
