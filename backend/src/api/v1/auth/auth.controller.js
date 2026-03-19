'use strict';

/**
 * Auth controller — merges session-based and JWT-based auth handlers.
 * Split into two namespaces: `module.exports.session` and `module.exports.jwt`
 */

const db = require('../../../../models');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const apiResponse = require('../../../../utils/apiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../../../../services/tokenService');
const sessionStore = require('../../../../services/sessionStore');

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

    const { username, email, password, role } = req.body;
    try {
      const allowedRoles = ['student', 'tutor', 'admin'];
      const selectedRole = allowedRoles.includes(role) ? role : 'student';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await db.User.create({ username, email, password: hashedPassword, role: selectedRole });

      req.session.userId = user.id;
      req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };

      return apiResponse.created(res, {
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
      }, 'User created successfully');
    } catch (error) {
      console.error('Error during user signup:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return apiResponse.conflict(res, 'User with this email already exists');
      }
      return apiResponse.internalError(res);
    }
  },

  login: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array().map(e => ({ field: e.path || e.param, message: e.msg }));
      return apiResponse.validationError(res, 'Validation failed', details);
    }

    const { email, password } = req.body;
    try {
      const user = await db.User.findOne({ where: { email } });
      if (!user) return apiResponse.unauthorized(res, 'Invalid email or password');

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return apiResponse.unauthorized(res, 'Invalid email or password');

      req.session.userId = user.id;
      req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };

      return apiResponse.success(res, {
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
      }, 'Login successful');
    } catch (error) {
      console.error('Error during user login:', error);
      return apiResponse.internalError(res);
    }
  },

  logout: (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return apiResponse.internalError(res, 'Error logging out');
      }
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

    const { username, email, password, role } = req.body;
    try {
      const allowedRoles = ['student', 'tutor', 'admin'];
      const selectedRole = allowedRoles.includes(role) ? role : 'student';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await db.User.create({ username, email, password: hashedPassword, role: selectedRole });

      const userPayload = { id: user.id, username: user.username, email: user.email, role: user.role };
      const accessToken  = generateAccessToken(userPayload);
      const refreshToken = generateRefreshToken(userPayload);
      sessionStore.setSession(user.id, refreshToken);

      return apiResponse.created(res, { user: userPayload, accessToken, refreshToken }, 'User created successfully');
    } catch (error) {
      console.error('JWT signup error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return apiResponse.conflict(res, 'User with this email already exists');
      }
      return apiResponse.internalError(res);
    }
  },

  signin: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array().map(e => ({ field: e.path || e.param, message: e.msg }));
      return apiResponse.validationError(res, 'Validation failed', details);
    }

    const { email, password } = req.body;
    try {
      const user = await db.User.findOne({ where: { email } });
      if (!user) return apiResponse.unauthorized(res, 'Invalid email or password');

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return apiResponse.unauthorized(res, 'Invalid email or password');

      const userPayload = { id: user.id, username: user.username, email: user.email, role: user.role };
      const accessToken  = generateAccessToken(userPayload);
      const refreshToken = generateRefreshToken(userPayload);
      sessionStore.setSession(user.id, refreshToken);

      return apiResponse.success(res, { user: userPayload, accessToken, refreshToken }, 'Sign in successful');
    } catch (error) {
      console.error('JWT signin error:', error);
      return apiResponse.internalError(res);
    }
  },

  refresh: async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return apiResponse.unauthorized(res, 'Refresh token is required');

    const result = verifyRefreshToken(refreshToken);
    if (!result.valid) return apiResponse.unauthorized(res, 'Refresh token is invalid or expired. Please sign in again.');

    const { userId } = result.decoded;
    if (!sessionStore.isValidSession(userId, refreshToken)) {
      sessionStore.removeSession(userId);
      return apiResponse.unauthorized(res, 'Refresh token has been revoked. Please sign in again.');
    }

    try {
      const user = await db.User.findByPk(userId);
      if (!user) {
        sessionStore.removeSession(userId);
        return apiResponse.unauthorized(res, 'User no longer exists. Please sign in again.');
      }

      const userPayload = { id: user.id, username: user.username, email: user.email, role: user.role };
      const newAccessToken  = generateAccessToken(userPayload);
      const newRefreshToken = generateRefreshToken(userPayload);
      sessionStore.setSession(userId, newRefreshToken);

      return apiResponse.success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Tokens refreshed successfully');
    } catch (error) {
      console.error('JWT refresh error:', error);
      return apiResponse.internalError(res);
    }
  },

  logout: (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const result = verifyRefreshToken(refreshToken);
      if (result.valid) sessionStore.removeSession(result.decoded.userId);
    }
    return apiResponse.success(res, null, 'Logout successful');
  },

  getProfile: async (req, res) => {
    try {
      const user = await db.User.findByPk(req.userId, {
        attributes: ['id', 'username', 'displayName', 'email', 'role', 'phone', 'nativeLanguage', 'createdAt'],
      });
      if (!user) return apiResponse.notFound(res, 'User not found');
      return apiResponse.success(res, { user }, 'Profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
      return apiResponse.internalError(res);
    }
  },
};

module.exports = { session, jwt };
