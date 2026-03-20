'use strict';
const Joi = require('joi');
const sendMessage = Joi.object({ message: Joi.string().trim().min(1).max(2000).required(), sessionId: Joi.number().integer().positive().allow(null) });
module.exports = { sendMessage };
