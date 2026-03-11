const jwt = require('jsonwebtoken');

// ============================================================================
// JWT Token Service
// Handles creation and verification of access & refresh tokens.
// Access token  → short-lived (default 20m), sent by frontend on every request.
// Refresh token → long-lived  (default 30d), used only to obtain new tokens.
// ============================================================================

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES  || '20m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '30d';

/**
 * Generate an access token containing user info.
 * @param {Object} user - { id, username, email, subscriptionTier }
 * @returns {string} signed JWT
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

/**
 * Generate a refresh token (minimal payload — just userId).
 * @param {Object} user - { id }
 * @returns {string} signed JWT
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

/**
 * Verify an access token.
 * @param {string} token
 * @returns {{ valid: true, decoded: Object } | { valid: false, error: string }}
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    return { valid: true, decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {{ valid: true, decoded: Object } | { valid: false, error: string }}
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    return { valid: true, decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
