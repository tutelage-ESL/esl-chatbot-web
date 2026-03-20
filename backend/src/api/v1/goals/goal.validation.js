'use strict';
const Joi = require('joi');
const create = Joi.object({ type: Joi.string().trim().min(1).max(100).required(), target: Joi.number().integer().positive().max(10000).required(), timeframe: Joi.string().valid('week', 'month', 'quarter').required(), description: Joi.string().trim().max(1000).allow('', null), difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced') });
const update = Joi.object({ description: Joi.string().trim().max(1000).allow('', null), target: Joi.number().integer().positive().max(10000), status: Joi.string().valid('active', 'completed', 'paused', 'cancelled'), progress: Joi.number().integer().min(0).max(100) });
module.exports = { create, update };
