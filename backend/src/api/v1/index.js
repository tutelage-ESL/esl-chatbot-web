'use strict';
const express = require('express');
const router = express.Router();

router.use('/users',        require('./users/user.routes'));
router.use('/profile',      require('./learner-profile/learnerProfile.routes'));
router.use('/subscriptions',require('./subscriptions/subscription.routes'));
router.use('/conversations', require('./conversations/conversation.routes'));
router.use('/pronunciation', require('./pronunciation/pronunciation.routes'));
router.use('/vocabulary',   require('./vocabulary/vocabulary.routes'));
router.use('/goals',        require('./goals/goals.routes'));
router.use('/dashboard',    require('./dashboard/dashboard.routes'));
router.use('/analytics',    require('./analytics/analytics.routes'));
router.use('/admin',        require('./admin/admin.routes'));

module.exports = router;
