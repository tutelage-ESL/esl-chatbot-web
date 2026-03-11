// ============================================================================
// JWT Authentication Middleware
// Extracts the Bearer token from the Authorization header, verifies it using
// the access token secret, and attaches the decoded user payload to req.user.
// Returns 401 if the header is missing, malformed, or the token is invalid/expired.
// ============================================================================

const { verifyAccessToken } = require('../services/tokenService');
const apiResponse = require('../utils/apiResponse');

/**
 * Require a valid JWT access token.
 * Attaches decoded payload to req.user on success.
 */
function requireJwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return apiResponse.unauthorized(res, 'Authorization header is missing');
  }

  // Expect format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return apiResponse.unauthorized(res, 'Authorization header must be: Bearer <token>');
  }

  const token = parts[1];
  const result = verifyAccessToken(token);

  if (!result.valid) {
    return apiResponse.unauthorized(res, 'Access token is invalid or expired');
  }

  // Attach decoded user data so downstream handlers can use it
  req.user = result.decoded;
  req.userId = result.decoded.userId;

  next();
}

/**
 * Optional JWT auth — continues regardless but sets req.user if a valid token exists.
 */
function optionalJwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const result = verifyAccessToken(parts[1]);
      if (result.valid) {
        req.user = result.decoded;
        req.userId = result.decoded.userId;
        req.isAuthenticated = true;
        return next();
      }
    }
  }

  req.isAuthenticated = false;
  next();
}

module.exports = {
  requireJwtAuth,
  optionalJwtAuth,
};
