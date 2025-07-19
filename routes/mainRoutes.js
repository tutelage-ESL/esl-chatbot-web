const express = require('express');
const router = express.Router();
const models = require('../models');

router.get('/', (req, res) => {
  res.render('login');
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/signup', (req, res) => {
  res.render('signup');
});

router.get('/dashboard', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const user = await models.User.findByPk(req.session.userId);
  res.render('dashboard', { user, currentRoute: 'dashboard' });
});

router.get('/chat', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.render('chat', { currentRoute: 'chat' });
});



router.get('/voice', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.render('voice', { response: '', currentRoute: 'voice' });
});

router.post('/voice', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const { message } = req.body;
  let response = '';
  if (message) {
    const model = global.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const prompt = `You are an ESL (English as Second Language) tutor. Help the student with their English learning. Student says: "${message}". Provide a helpful, encouraging response.`;
    const result = await model.generateContent(prompt);
    response = result.response.text();
  }
  res.render('voice', { response, currentRoute: 'voice' });
});

router.get('/progress', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const progress = await models.Progress.findOne({ where: { userId: req.session.userId } }) || { progress: 0, updatedAt: new Date(), activities: [] };
  res.render('progress', { progress, currentRoute: 'progress' });
});

router.get('/settings', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const settings = await models.Settings.findOne({ where: { userId: req.session.userId } }) || { language: 'en', voiceSpeed: 1.0, autoSpeak: false };
  res.render('settings', { settings, currentRoute: 'settings' });
});

router.post('/settings', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const { language, voiceSpeed, autoSpeak } = req.body;
  await models.Settings.upsert({
    userId: req.session.userId,
    language,
    voiceSpeed: parseFloat(voiceSpeed),
    autoSpeak: autoSpeak === 'on'
  });
  res.redirect('/settings');
});

module.exports = router;