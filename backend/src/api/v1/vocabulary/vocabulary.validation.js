'use strict';
const Joi = require('joi');
const create = Joi.object({ word: Joi.string().trim().min(1).max(100).required(), definition: Joi.string().trim().min(1).max(1000).required(), example: Joi.string().trim().max(500).allow('', null), difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'), category: Joi.string().trim().max(100).allow('', null), pronunciation: Joi.string().trim().max(100).allow('', null) });
const practice = Joi.object({ quality: Joi.number().integer().min(0).max(5).required() });
module.exports = { create, practice };
