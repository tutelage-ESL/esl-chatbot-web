// ============================================================================
// In-Memory Session Store
// Tracks active JWT sessions keyed by userId.
// Each entry stores the current refresh token so we can:
//   1. Validate that a presented refresh token is the one we issued.
//   2. Rotate tokens (replace the old refresh token with a new one).
//   3. Invalidate sessions on logout.
//
// NOTE: This is an in-memory Map — sessions are lost on server restart.
// For production, replace with Redis or a database table.
// ============================================================================

const sessions = new Map();

/**
 * Create or update a session for a user.
 * @param {number|string} userId
 * @param {string} refreshToken
 */
function setSession(userId, refreshToken) {
  sessions.set(String(userId), { userId, refreshToken });
}

/**
 * Get the stored session for a user.
 * @param {number|string} userId
 * @returns {{ userId, refreshToken } | undefined}
 */
function getSession(userId) {
  return sessions.get(String(userId));
}

/**
 * Check if the provided refresh token matches the stored one.
 * @param {number|string} userId
 * @param {string} refreshToken
 * @returns {boolean}
 */
function isValidSession(userId, refreshToken) {
  const session = sessions.get(String(userId));
  if (!session) return false;
  return session.refreshToken === refreshToken;
}

/**
 * Remove a user's session (used on logout or token theft detection).
 * @param {number|string} userId
 */
function removeSession(userId) {
  sessions.delete(String(userId));
}

module.exports = {
  setSession,
  getSession,
  isValidSession,
  removeSession,
};
