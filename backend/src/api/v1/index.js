'use strict';

/**
 * src/api/v1/index.js
 * Mounts every feature router under the /api prefix.
 * app.js does: app.use('/api', require('./api/v1'))
 */

const express = require('express');
const router = express.Router();

router.use('/auth',         require('./auth/auth.routes'));
router.use('/chat',         require('./chat/chat.routes'));
router.use('/voice',        require('./voice/voice.routes'));
router.use('/vocabulary',   require('./vocabulary/vocabulary.routes'));
router.use('/goals',        require('./goals/goals.routes'));
router.use('/progress',     require('./progress/progress.routes'));
router.use('/settings',     require('./settings/settings.routes'));
router.use('/subscription', require('./subscription/subscription.routes'));
router.use('/pronunciation', require('./pronunciation/pronunciation.routes'));
router.use('/dashboard',    require('./dashboard/dashboard.routes'));
router.use('/',             require('./health/health.routes'));

module.exports = router;
