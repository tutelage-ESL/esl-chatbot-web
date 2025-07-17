const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('login');
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/signup', (req, res) => {
  res.render('signup');
});

router.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

router.get('/chat', (req, res) => {
  res.render('dashboard', { initialSection: 'chat' });
});

router.get('/voice', (req, res) => {
  res.render('dashboard', { initialSection: 'voice' });
});

router.get('/progress', (req, res) => {
  res.render('dashboard', { initialSection: 'progress' });
});

router.get('/settings', (req, res) => {
  res.render('dashboard', { initialSection: 'settings' });
});

module.exports = router;