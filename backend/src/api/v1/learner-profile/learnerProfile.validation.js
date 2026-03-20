'use strict';
const Joi = require('joi');
const LEVELS = ['beginner','elementary','intermediate','upper-intermediate','advanced','proficient'];
const update = Joi.object({
  currentLevel: Joi.string().valid(...LEVELS),
  targetLevel: Joi.string().valid(...LEVELS),
  learningPurpose: Joi.string().trim().max(200).allow('', null),
  topicsOfInterest: Joi.array().items(Joi.string()).max(20),
  aiPersonality: Joi.string().valid('friendly', 'strict', 'formal'),
  voiceSpeed: Joi.number().min(0.5).max(2.0),
  autoSpeak: Joi.boolean(),
  uiLanguage: Joi.string().trim().max(10),
  theme: Joi.string().valid('light', 'dark', 'system'),
  weeklyGoalMinutes: Joi.number().integer().min(0).max(10000),
  timezone: Joi.string().trim().max(50)
});
module.exports = { update };
