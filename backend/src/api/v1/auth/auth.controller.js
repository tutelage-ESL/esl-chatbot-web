'use strict';

/**
 * Auth controller — merges session-based and JWT-based auth handlers.
 * Split into two namespaces: `module.exports.session` and `module.exports.jwt`
 */

const { validationResult } = require('express-validator');
const apiResponse = require('../../../utils/ApiResponse');
const authService = require('./auth.service');

// ============================================================================
// SESSION AUTH
// ============================================================================
const session = {
  signup: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array().map(e => ({ field: e.path || e.param, message: e.msg }));
      return apiResponse.validationError(res, 'Validation failed', details);
    }
    try {
      const user = await authService.registerUser(req.body);
      req.session.userId = user.id;
      req.session.user = user;
      return apiResponse.created(res, { user }, 'User created successfully');
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') return apiResponse.conflict(res, 'User with this email already exists');
      return apiResponse.internalError(res);
    }
  },

  login: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array().map(e => ({ field: e.path || e.param, message: e.msg }));
      return apiResponse.validationError(res, 'Validation failed', details);
    }
    try {
      const user = await authService.verifyCredentials(req.body);
      if (!user) return apiResponse.unauthorized(res, 'Invalid email or password');
      req.session.userId = user.id;
      req.session.user = user;
      return apiResponse.success(res, { user }, 'Login successful');
    } catch (err) {
      return apiResponse.internalError(res);
    }
  },

  logout: (req, res) => {
    req.session.destroy(err => {
      if (err) return apiResponse.internalError(res, 'Error logging out');
      return apiResponse.success(res, null, 'Logout successful');
    });
  },

  getStatus: (req, res) => {
    if (req.session && req.session.userId) {
      return apiResponse.success(res, { authenticated: true, user: req.session.user || { id: req.session.userId } });
    }
    return apiResponse.success(res, { authenticated: false, user: null });
  },
};

// ============================================================================
// JWT AUTH
// ============================================================================
const jwt = {
  signup: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array().map(e => ({ field: e.path || e.param, message: e.msg }));
      return apiResponse.validationError(res, 'Validation failed', details);
    }
    try {
      const user = await authService.registerUser(req.body);
      const tokens = authService.issueTokens(user);
      return apiResponse.created(res, { user, ...tokens }, 'User created successfully');
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') return apiResponse.conflict(res, 'User with this email already exists');
      return apiResponse.internalError(res);
    }
  },

  signin: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array().map(e => ({ field: e.path || e.param, message: e.msg }));
      return apiResponse.validationError(res, 'Validation failed', details);
    }
    try {
      const user = await authService.verifyCredentials(req.body);
      if (!user) return apiResponse.unauthorized(res, 'Invalid email or password');
      const tokens = authService.issueTokens(user);
      return apiResponse.success(res, { user, ...tokens }, 'Sign in successful');
    } catch (err) {
      return apiResponse.internalError(res);
    }
  },

  refresh: async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return apiResponse.unauthorized(res, 'Refresh token is required');
    try {
      const tokens = await authService.refreshTokens(refreshToken);
      if (!tokens) return apiResponse.unauthorized(res, 'Refresh token is invalid or expired. Please sign in again.');
      return apiResponse.success(res, tokens, 'Tokens refreshed successfully');
    } catch (err) {
      return apiResponse.internalError(res);
    }
  },

  logout: (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) authService.revokeToken(refreshToken);
    return apiResponse.success(res, null, 'Logout successful');
  },

  getProfile: async (req, res) => {
    try {
      const user = await authService.getUserById(req.userId);
      if (!user) return apiResponse.notFound(res, 'User not found');
      return apiResponse.success(res, { user }, 'Profile retrieved successfully');
    } catch (err) {
      return apiResponse.internalError(res);
    }
  },
};

module.exports = { session, jwt };
