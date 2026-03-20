'use strict';
const Joi = require('joi');
const updateProfile = Joi.object({
  username: Joi.string().trim().min(2).max(50),
  displayName: Joi.string().trim().max(100).allow('', null),
  phone: Joi.string().trim().max(20).allow('', null),
  nativeLanguage: Joi.string().trim().max(50).allow('', null)
});
module.exports = { updateProfile };
