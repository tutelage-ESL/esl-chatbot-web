'use strict';
const MESSAGES = {
  AUTH: { SIGNUP_SUCCESS: 'User created successfully', LOGIN_SUCCESS: 'Login successful', LOGOUT_SUCCESS: 'Logout successful', INVALID_CREDENTIALS: 'Invalid email or password', EMAIL_EXISTS: 'User with this email already exists', TOKEN_REFRESHED: 'Tokens refreshed successfully', TOKEN_REQUIRED: 'Refresh token is required', TOKEN_INVALID: 'Refresh token is invalid or expired. Please sign in again.', TOKEN_REVOKED: 'Refresh token has been revoked. Please sign in again.' },
  USER: { NOT_FOUND: 'User not found', UPDATED: 'User updated successfully', DELETED: 'User deleted successfully' },
  GENERAL: { INTERNAL_ERROR: 'Internal server error', NOT_FOUND: 'Resource not found', VALIDATION_FAILED: 'Validation failed. Please check your input.' }
};
module.exports = MESSAGES;
