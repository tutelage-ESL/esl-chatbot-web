'use strict';
const Joi = require('joi');
const changePlan = Joi.object({ plan: Joi.string().valid('free', 'basic', 'pro').required() });
module.exports = { changePlan };
