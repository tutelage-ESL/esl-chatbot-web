const db = require('../models');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array(),
      message: 'Validation failed'
    });
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
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier
    };
    
    res.status(201).json({ 
      success: true, 
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error) {
    console.error('Error during user signup:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this email already exists',
        errors: [{ msg: 'User with this email already exists' }]
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      errors: [{ msg: 'Internal server error' }]
    });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array(),
      message: 'Validation failed'
    });
  }

  const { email, password } = req.body;

  try {
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password',
        errors: [{ msg: 'Invalid email or password' }]
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password',
        errors: [{ msg: 'Invalid email or password' }]
      });
    }

    req.session.userId = user.id; // Store user ID in session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier
    };
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      errors: [{ msg: 'Internal server error' }]
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error logging out'
      });
    }
    res.json({ 
      success: true, 
      message: 'Logout successful'
    });
  });
};