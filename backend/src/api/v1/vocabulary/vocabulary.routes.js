'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('./vocabulary.controller');
const { requireJwtAuth } = require('../../../../middleware/jwtMiddleware');

router.get('/',             requireJwtAuth, ctrl.getVocabulary);
router.post('/',            requireJwtAuth, ctrl.addVocabulary);
router.put('/:id',          requireJwtAuth, ctrl.updateVocabulary);
router.delete('/:id',       requireJwtAuth, ctrl.deleteVocabulary);
router.get('/practice',     requireJwtAuth, ctrl.getPracticeWords);
router.post('/practice',    ctrl.recordPractice);
router.get('/quiz',         ctrl.getQuiz);

module.exports = router;
