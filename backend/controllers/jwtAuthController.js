// ============================================================================
// JWT Auth Controller
// Handles sign-in, token refresh (with rotation), and logout.
// All responses follow the standard format:
//   { success: boolean, message: string, data?: object }
// ============================================================================

const db = require('../models');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const apiResponse = require('../utils/apiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../services/tokenService');
const sessionStore = require('../services/sessionStore');

// ========================  SIGN IN  ========================

exports.signin = async (req, res) => {
  // Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({
      field: e.path || e.param,
      message: e.msg,
    }));
    return apiResponse.validationError(res, 'Validation failed', details);
  }

  const { email, password } = req.body;

  try {
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      return apiResponse.unauthorized(res, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return apiResponse.unauthorized(res, 'Invalid email or password');
    }

    // Build a clean user object for token payloads & response
    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    };

    // Generate tokens
    const accessToken  = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Store refresh token in the server-side session store
    sessionStore.setSession(user.id, refreshToken);

    return apiResponse.success(res, {
      user: userPayload,
      accessToken,
      refreshToken,
    }, 'Sign in successful');
  } catch (error) {
    console.error('JWT signin error:', error);
    return apiResponse.internalError(res);
  }
};

// ========================  SIGN UP  ========================

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({
      field: e.path || e.param,
      message: e.msg,
    }));
    return apiResponse.validationError(res, 'Validation failed', details);
  }

  const { username, email, password, subscriptionTier } = req.body;

  try {
    const validTiers = ['standard', 'gold', 'diamond'];
    const selectedTier = validTiers.includes(subscriptionTier)
      ? subscriptionTier
      : 'standard';

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.User.create({
      username,
      email,
      password: hashedPassword,
      subscriptionTier: selectedTier,
    });

    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    };

    // Issue tokens immediately so the user is logged in after signup
    const accessToken  = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);
    sessionStore.setSession(user.id, refreshToken);

    return apiResponse.created(res, {
      user: userPayload,
      accessToken,
      refreshToken,
    }, 'User created successfully');
  } catch (error) {
    console.error('JWT signup error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return apiResponse.conflict(res, 'User with this email already exists');
    }
    return apiResponse.internalError(res);
  }
};

// ========================  REFRESH  ========================

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return apiResponse.unauthorized(res, 'Refresh token is required');
  }

  // 1. Verify the refresh token signature & expiry
  const result = verifyRefreshToken(refreshToken);
  if (!result.valid) {
    return apiResponse.unauthorized(res, 'Refresh token is invalid or expired. Please sign in again.');
  }

  const { userId } = result.decoded;

  // 2. Check that the token exists in the session store (prevents reuse of old tokens)
  if (!sessionStore.isValidSession(userId, refreshToken)) {
    // Possible token reuse / theft → nuke the session entirely
    sessionStore.removeSession(userId);
    return apiResponse.unauthorized(res, 'Refresh token has been revoked. Please sign in again.');
  }

  try {
    // 3. Fetch the latest user data from DB (in case role/tier changed)
    const user = await db.User.findByPk(userId);
    if (!user) {
      sessionStore.removeSession(userId);
      return apiResponse.unauthorized(res, 'User no longer exists. Please sign in again.');
    }

    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    };

    // 4. Rotate tokens — issue a new pair, invalidate the old refresh token
    const newAccessToken  = generateAccessToken(userPayload);
    const newRefreshToken = generateRefreshToken(userPayload);
    sessionStore.setSession(userId, newRefreshToken);

    return apiResponse.success(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }, 'Tokens refreshed successfully');
  } catch (error) {
    console.error('JWT refresh error:', error);
    return apiResponse.internalError(res);
  }
};

// ========================  LOGOUT  ========================

exports.logout = (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    // Verify to get userId, then remove session
    const result = verifyRefreshToken(refreshToken);
    if (result.valid) {
      sessionStore.removeSession(result.decoded.userId);
    }
  }

  // Even if no token was sent or verification failed, respond with success
  // so the frontend can clear its state without error handling.
  return apiResponse.success(res, null, 'Logout successful');
};

// ========================  PROFILE  ========================

exports.getProfile = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.userId, {
      attributes: ['id', 'username', 'email', 'subscriptionTier', 'createdAt'],
    });

    if (!user) {
      return apiResponse.notFound(res, 'User not found');
    }

    return apiResponse.success(res, { user }, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Get profile error:', error);
    return apiResponse.internalError(res);
  }
};
