/**
 * Authentication Middleware
 * Reusable middleware for authentication checks
 */

const apiResponse = require('../utils/apiResponse');

/**
 * Require authentication - blocks request if not authenticated
 */
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return apiResponse.unauthorized(res, 'Authentication required');
    }

    // Attach user info to request for convenience
    req.userId = req.session.userId;
    req.user = req.session.user || { id: req.session.userId };

    next();
}

/**
 * Optional authentication - continues regardless but sets user if authenticated
 */
function optionalAuth(req, res, next) {
    if (req.session && req.session.userId) {
        req.userId = req.session.userId;
        req.user = req.session.user || { id: req.session.userId };
        req.isAuthenticated = true;
    } else {
        req.isAuthenticated = false;
    }

    next();
}

/**
 * Check for public event mode - allows unauthenticated access in special mode
 */
function publicEventAuth(req, res, next) {
    if (process.env.PUBLIC_EVENT_MODE === 'true') {
        return optionalAuth(req, res, next);
    }
    return requireAuth(req, res, next);
}

module.exports = {
    requireAuth,
    optionalAuth,
    publicEventAuth
};
