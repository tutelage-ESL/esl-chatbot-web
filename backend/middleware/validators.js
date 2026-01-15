/**
 * Input Validation Middleware
 * 
 * OWASP Security Best Practice: Validate all inputs
 * 
 * Features:
 * - Schema-based validation using Joi
 * - Type checking
 * - Length limits
 * - Reject unexpected fields
 * - HTML/script sanitization
 */

const Joi = require('joi');
const apiResponse = require('../utils/apiResponse');

// ============================================================================
// COMMON VALIDATION RULES
// ============================================================================

// Maximum lengths for different field types
const MAX_LENGTHS = {
    username: 50,
    email: 100,
    password: 128,
    shortText: 100,
    mediumText: 500,
    longText: 1000,
    message: 2000,
    description: 1000
};

// Common field validators
const commonFields = {
    id: Joi.number().integer().positive(),
    username: Joi.string().trim().min(2).max(MAX_LENGTHS.username).pattern(/^[a-zA-Z0-9_-]+$/),
    email: Joi.string().trim().email().max(MAX_LENGTHS.email).lowercase(),
    password: Joi.string().min(6).max(MAX_LENGTHS.password),
    message: Joi.string().trim().min(1).max(MAX_LENGTHS.message),
    shortText: Joi.string().trim().max(MAX_LENGTHS.shortText),
    mediumText: Joi.string().trim().max(MAX_LENGTHS.mediumText),
    longText: Joi.string().trim().max(MAX_LENGTHS.longText)
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Authentication Schemas
 */
const authSchemas = {
    signup: Joi.object({
        username: commonFields.username.required(),
        email: commonFields.email.required(),
        password: commonFields.password.required(),
        subscriptionTier: Joi.string().valid('standard', 'gold', 'diamond').default('standard')
    }).unknown(false), // Reject unexpected fields

    login: Joi.object({
        email: commonFields.email.required(),
        password: Joi.string().required().max(MAX_LENGTHS.password)
    }).unknown(false)
};

/**
 * Chat/Message Schemas
 */
const chatSchemas = {
    sendMessage: Joi.object({
        message: commonFields.message.required()
    }).unknown(false),

    voiceMessage: Joi.object({
        message: commonFields.message.required()
    }).unknown(false)
};

/**
 * Vocabulary Schemas
 */
const vocabularySchemas = {
    create: Joi.object({
        word: Joi.string().trim().min(1).max(100).required(),
        definition: Joi.string().trim().min(1).max(MAX_LENGTHS.longText).required(),
        example: Joi.string().trim().max(MAX_LENGTHS.mediumText).allow('', null),
        difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
        category: Joi.string().trim().max(MAX_LENGTHS.shortText).allow('', null),
        pronunciation: Joi.string().trim().max(MAX_LENGTHS.shortText).allow('', null)
    }).unknown(false),

    update: Joi.object({
        definition: Joi.string().trim().min(1).max(MAX_LENGTHS.longText),
        example: Joi.string().trim().max(MAX_LENGTHS.mediumText).allow('', null),
        difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
        category: Joi.string().trim().max(MAX_LENGTHS.shortText).allow('', null),
        masteryLevel: Joi.number().integer().min(0).max(100)
    }).unknown(false)
};

/**
 * Goals Schemas
 */
const goalSchemas = {
    create: Joi.object({
        type: Joi.string().trim().min(1).max(MAX_LENGTHS.shortText).required(),
        target: Joi.number().integer().positive().max(10000).required(),
        timeframe: Joi.string().valid('week', 'month', 'quarter').required(),
        description: Joi.string().trim().max(MAX_LENGTHS.description).allow('', null),
        difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
        category: Joi.string().trim().max(MAX_LENGTHS.shortText).allow('', null)
    }).unknown(false),

    update: Joi.object({
        description: Joi.string().trim().max(MAX_LENGTHS.description).allow('', null),
        target: Joi.number().integer().positive().max(10000),
        timeframe: Joi.string().valid('week', 'month', 'quarter'),
        status: Joi.string().valid('active', 'completed', 'paused', 'cancelled')
    }).unknown(false),

    progress: Joi.object({
        activity: Joi.string().trim().max(MAX_LENGTHS.shortText).allow('', null),
        value: Joi.number().integer().min(0).max(1000),
        notes: Joi.string().trim().max(MAX_LENGTHS.mediumText).allow('', null)
    }).unknown(false)
};

/**
 * Settings Schemas
 */
const settingsSchemas = {
    update: Joi.object({
        user_id: Joi.number().integer().positive(),
        language: Joi.string().trim().min(2).max(10).default('en'),
        voiceSpeed: Joi.number().min(0.5).max(2.0).default(1.0),
        autoSpeak: Joi.boolean().default(false)
    }).unknown(false)
};

/**
 * Progress Schemas
 */
const progressSchemas = {
    update: Joi.object({
        user_id: Joi.number().integer().positive().required(),
        progress: Joi.number().integer().min(0).max(100).required()
    }).unknown(false)
};

/**
 * TTS Schemas
 */
const ttsSchemas = {
    synthesize: Joi.object({
        text: Joi.string().trim().min(1).max(MAX_LENGTHS.longText).required(),
        voiceId: Joi.string().trim().max(100).allow('', null),
        speed: Joi.number().min(0.5).max(2.0)
    }).unknown(false)
};

// ============================================================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================================================

/**
 * Creates validation middleware for a given schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
function validate(schema, property = 'body') {
    return (req, res, next) => {
        const dataToValidate = req[property];

        const { error, value } = schema.validate(dataToValidate, {
            abortEarly: false, // Return all errors, not just the first
            stripUnknown: false // Don't silently strip unknown fields (we want to reject them)
        });

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/"/g, "'")
            }));

            return apiResponse.validationError(
                res,
                'Validation failed. Please check your input.',
                details
            );
        }

        // Replace request data with validated/sanitized data
        req[property] = value;
        next();
    };
}

/**
 * Sanitize string to prevent XSS
 * Removes or escapes potentially dangerous characters
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return str;

    // Remove script tags and common XSS vectors
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/<\s*\/?\s*script/gi, '');
}

/**
 * Middleware to sanitize all string inputs in request body
 */
function sanitizeInputs(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        });
    }
    next();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Schemas
    authSchemas,
    chatSchemas,
    vocabularySchemas,
    goalSchemas,
    settingsSchemas,
    progressSchemas,
    ttsSchemas,

    // Middleware factory
    validate,

    // Sanitization
    sanitizeInputs,
    sanitizeString,

    // Constants
    MAX_LENGTHS
};
