'use strict';
const Joi = require('joi');

const signup = Joi.object({
  username: Joi.string().trim().min(2).max(50).pattern(/^[a-zA-Z0-9_-]+$/).required(),
  email: Joi.string().trim().email().max(100).lowercase().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('student', 'tutor', 'admin').default('student')
});

const signin = Joi.object({
  email: Joi.string().trim().email().max(100).lowercase().required(),
  password: Joi.string().required().max(128)
});

const refresh = Joi.object({
  refreshToken: Joi.string().required()
});

module.exports = { signup, signin, refresh };
