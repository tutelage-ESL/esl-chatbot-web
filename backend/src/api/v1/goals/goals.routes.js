'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('./goals.controller');
const { requireJwtAuth } = require('../../../../middleware/jwtMiddleware');

router.post('/',                 requireJwtAuth, ctrl.createGoal);
router.get('/',                  requireJwtAuth, ctrl.getGoals);
router.put('/:id',               requireJwtAuth, ctrl.updateGoal);
router.delete('/:id',            requireJwtAuth, ctrl.deleteGoal);
router.post('/:id/progress',     requireJwtAuth, ctrl.recordProgress);
router.get('/suggestions',       requireJwtAuth, ctrl.getSuggestions);

module.exports = router;
