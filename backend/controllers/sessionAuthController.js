const db = require('../models');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const apiResponse = require('../utils/apiResponse');

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({
      field: e.path || e.param,
      message: e.msg
    }));
    return apiResponse.validationError(res, 'Validation failed', details);
  }

  const { username, email, password, subscriptionTier } = req.body;

  try {
    // Validate subscription tier
    const validTiers = ['standard', 'gold', 'diamond'];
    const selectedTier = validTiers.includes(subscriptionTier) ? subscriptionTier : 'standard';

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.User.create({
      username,
      email,
      password: hashedPassword,
      subscriptionTier: selectedTier,
    });

    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier
    };

    return apiResponse.created(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        subscriptionTier: user.subscriptionTier
      }
    }, 'User created successfully');
  } catch (error) {
    console.error('Error during user signup:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return apiResponse.conflict(res, 'User with this email already exists');
    }
    return apiResponse.internalError(res);
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({
      field: e.path || e.param,
      message: e.msg
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

    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier
    };

    return apiResponse.success(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        subscriptionTier: user.subscriptionTier
      }
    }, 'Login successful');
  } catch (error) {
    console.error('Error during user login:', error);
    return apiResponse.internalError(res);
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return apiResponse.internalError(res, 'Error logging out');
    }
    return apiResponse.success(res, null, 'Logout successful');
  });
};

exports.getStatus = (req, res) => {
  if (req.session && req.session.userId) {
    return apiResponse.success(res, {
      authenticated: true,
      user: req.session.user || { id: req.session.userId }
    });
  } else {
    return apiResponse.success(res, {
      authenticated: false,
      user: null
    });
  }
};