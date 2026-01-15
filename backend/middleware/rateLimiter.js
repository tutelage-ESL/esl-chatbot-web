/**
 * Rate Limiting Middleware
 * 
 * OWASP Security Best Practice: Protect against brute force and DoS attacks
 * 
 * Implements:
 * - IP-based rate limiting for unauthenticated requests
 * - User-based rate limiting for authenticated requests
 * - Different limits for different endpoint types
 * - Graceful 429 responses using standardized API format
 */

const rateLimit = require('express-rate-limit');
const apiResponse = require('../utils/apiResponse');

/**
 * Custom key generator that uses user ID if authenticated, otherwise IP
 * Note: validate is disabled because we handle key generation appropriately
 */
const keyGenerator = (req) => {
    // Use user ID for authenticated requests (more accurate limiting)
    if (req.userId || req.session?.userId) {
        return `user_${req.userId || req.session.userId}`;
    }
    // Fall back to IP for unauthenticated requests
    return req.ip || 'unknown';
};

/**
 * Custom handler for rate limit exceeded - uses standardized API response
 */
const rateLimitHandler = (req, res) => {
    return apiResponse.rateLimited(res, 'Too many requests. Please slow down and try again later.');
};

/**
 * Skip rate limiting for certain conditions (e.g., health checks)
 */
const skipHealthChecks = (req) => {
    return req.path === '/api/health';
};

// ============================================================================
// RATE LIMITERS FOR DIFFERENT ENDPOINT TYPES
// ============================================================================

/**
 * Strict limiter for authentication endpoints
 * Prevents brute force password attacks
 * 
 * Limits: 5 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    validate: false, // Disable validation - we handle keys appropriately
    handler: (req, res) => {
        return apiResponse.rateLimited(res, 'Too many login attempts. Please try again after 15 minutes.');
    },
    skip: (req) => {
        // Skip rate limiting for logout (it's not a security risk)
        return req.path.includes('/logout');
    }
});

/**
 * Limiter for AI/Chat endpoints
 * Protects against abuse of expensive AI API calls
 * 
 * Limits: 30 requests per minute per user/IP
 */
const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    validate: false, // Disable validation - we handle keys appropriately
    handler: rateLimitHandler
});

/**
 * Limiter for TTS (Text-to-Speech) endpoints
 * TTS is resource-intensive, needs stricter limits
 * 
 * Limits: 10 requests per minute per user/IP
 */
const ttsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    validate: false, // Disable validation - we handle keys appropriately
    handler: rateLimitHandler
});

/**
 * General API limiter for all other endpoints
 * Reasonable limit for normal API usage
 * 
 * Limits: 100 requests per minute per user/IP
 */
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    validate: false, // Disable validation - we handle keys appropriately
    handler: rateLimitHandler,
    skip: skipHealthChecks
});

/**
 * Strict limiter for sensitive operations
 * For password reset, email change, etc.
 * 
 * Limits: 3 requests per hour per IP
 */
const sensitiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    validate: false, // Disable validation - we handle keys appropriately
    handler: (req, res) => {
        return apiResponse.rateLimited(res, 'Too many attempts. Please try again in an hour.');
    }
});

module.exports = {
    authLimiter,
    chatLimiter,
    ttsLimiter,
    generalLimiter,
    sensitiveLimiter
};
