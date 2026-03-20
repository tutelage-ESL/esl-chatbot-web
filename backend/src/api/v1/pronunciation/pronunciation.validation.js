'use strict';
const Joi = require('joi');
const analyze = Joi.object({ expectedText: Joi.string().trim().min(1).max(500).required(), audioData: Joi.string().allow('', null) });
module.exports = { analyze };
