// =============================================================================
// LEGACY AUTH CONTROLLER — FOR REFERENCE ONLY
// =============================================================================
// Handles auth by rendering EJS views (signup/login pages) and redirecting
// the browser. Used only by the legacy EJS server (server-legacy.js).
// The active server uses sessionAuthController.js and jwtAuthController.js.
// =============================================================================

const db = require('../models');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('signup', { errors: errors.array(), oldInput: req.body });
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
    req.session.userId = user.id; // Store user ID in session
    res.redirect('/dashboard'); // Redirect to dashboard after signup
  } catch (error) {
    console.error('Error during user signup:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.render('signup', { errors: [{ msg: 'User with this email already exists' }], oldInput: req.body });
    }
    res.render('signup', { errors: [{ msg: 'Internal server error' }], oldInput: req.body });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('login', { errors: errors.array(), oldInput: req.body });
  }

  const { email, password } = req.body;

  try {
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      return res.render('login', { errors: [{ msg: 'Invalid email or password' }], oldInput: req.body });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render('login', { errors: [{ msg: 'Invalid email or password' }], oldInput: req.body });
    }

    req.session.userId = user.id; // Store user ID in session
    res.redirect('/dashboard'); // Redirect to dashboard after login
  } catch (error) {
    console.error('Error during user login:', error);
    res.render('login', { errors: [{ msg: 'Internal server error' }], oldInput: req.body });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.redirect('/dashboard'); // Or handle error appropriately
    }
    res.redirect('/login');
  });
};