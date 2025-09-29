const express = require('express');
const router = express.Router();
const models = require('../models');
const fs = require('fs');
const path = require('path');

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
  
  let user;
  try {
    user = await models.User.findByPk(req.session.userId);
  } catch (error) {
    console.error('Error finding user:', error);
    return res.redirect('/login');
  }
  
  // Load real statistics from progress.json
  let stats = {
    lessonsCompleted: 0,
    studyTime: '0h',
    dayStreak: 0,
    achievements: 0
  };
  
  try {
    const progressPath = path.join(__dirname, '../data/progress.json');
    const progressFile = fs.readFileSync(progressPath, 'utf8');
    const progressData = JSON.parse(progressFile);
    const userId = req.session.userId || 'user_hehxzwj55vhmd0u2mriz1';
    const userProgress = progressData[userId];
    
    if (userProgress) {
      // Calculate lessons completed (based on practice sessions and interactions)
      stats.lessonsCompleted = userProgress.metrics.practiceSessionsCompleted + Math.floor(userProgress.metrics.totalInteractions / 5);
      
      // Calculate study time (estimate based on interactions)
      const avgTimePerInteraction = 2; // minutes
      const totalMinutes = userProgress.metrics.totalInteractions * avgTimePerInteraction;
      stats.studyTime = totalMinutes >= 60 ? Math.floor(totalMinutes / 60) + 'h' : totalMinutes + 'm';
      
      // Calculate day streak (based on recent activity)
      const interactions = userProgress.interactions || [];
      if (interactions.length > 0) {
        const today = new Date();
        const lastActivity = new Date(interactions[0].timestamp);
        const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1) {
          // Count consecutive days with activity
          let streak = 1;
          const dates = interactions.map(i => new Date(i.timestamp).toDateString());
          const uniqueDates = [...new Set(dates)];
          
          for (let i = 1; i < uniqueDates.length; i++) {
            const currentDate = new Date(uniqueDates[i-1]);
            const prevDate = new Date(uniqueDates[i]);
            const diff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
            if (diff <= 1) {
              streak++;
            } else {
              break;
            }
          }
          stats.dayStreak = streak;
        }
      }
      
      // Calculate achievements (based on milestones)
      let achievements = 0;
      if (userProgress.metrics.totalInteractions >= 10) achievements++;
      if (userProgress.metrics.totalInteractions >= 25) achievements++;
      if (userProgress.metrics.voiceInteractions >= 5) achievements++;
      if (stats.dayStreak >= 3) achievements++;
      if (stats.dayStreak >= 7) achievements++;
      if (stats.lessonsCompleted >= 5) achievements++;
      stats.achievements = achievements;
    }
  } catch (error) {
    console.error('Error loading progress data:', error);
  }
  
  try {
    res.render('dashboard', { user, stats, currentRoute: 'dashboard' });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
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
    const model = global.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are an ESL (English as Second Language) tutor. Help the student with their English learning. Student says: "${message}". Provide a helpful, encouraging response.`;
    const result = await model.generateContent(prompt);
    response = result.response.text();
  }
  res.render('voice', { response, currentRoute: 'voice' });
});

router.get('/progress', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  
  let progress;
  try {
    progress = await models.Progress.findOne({ where: { userId: req.session.userId } }) || { progress: 0, updatedAt: new Date(), activities: [], chatMessageCount: 0, totalWordsTyped: 0, lastActiveDate: new Date() };
  } catch (error) {
    console.error('Error finding progress:', error);
    progress = { progress: 0, updatedAt: new Date(), activities: [], chatMessageCount: 0, totalWordsTyped: 0, lastActiveDate: new Date() };
  }
  
  // Load real statistics from progress.json
  let stats = {
    studyTime: '0h',
    dayStreak: 0,
    weeklyGoal: 0,
    completionRate: 0,
    averageSessionTime: '0m',
    totalSessions: 0
  };
  
  try {
    const progressPath = path.join(__dirname, '../data/progress.json');
    const progressFile = fs.readFileSync(progressPath, 'utf8');
    const progressData = JSON.parse(progressFile);
    const userId = req.session.userId || 'user_hehxzwj55vhmd0u2mriz1';
    const userProgress = progressData[userId];
    
    if (userProgress) {
      // Calculate study time (estimate based on interactions)
      const avgTimePerInteraction = 2; // minutes
      const totalMinutes = userProgress.metrics.totalInteractions * avgTimePerInteraction;
      stats.studyTime = totalMinutes >= 60 ? Math.floor(totalMinutes / 60) + 'h' : totalMinutes + 'm';
      
      // Calculate day streak (based on recent activity)
      const interactions = userProgress.interactions || [];
      if (interactions.length > 0) {
        const today = new Date();
        const lastActivity = new Date(interactions[0].timestamp);
        const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1) {
          // Count consecutive days with activity
          let streak = 1;
          const dates = interactions.map(i => new Date(i.timestamp).toDateString());
          const uniqueDates = [...new Set(dates)];
          
          for (let i = 1; i < uniqueDates.length; i++) {
            const currentDate = new Date(uniqueDates[i-1]);
            const prevDate = new Date(uniqueDates[i]);
            const diff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
            if (diff <= 1) {
              streak++;
            } else {
              break;
            }
          }
          stats.dayStreak = streak;
        }
      }
      
      // Calculate weekly goal progress (target: 5 sessions per week)
      const weeklyTarget = 5;
      const thisWeekSessions = interactions.filter(i => {
        const interactionDate = new Date(i.timestamp);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return interactionDate >= weekStart;
      }).length;
      stats.weeklyGoal = Math.min(100, Math.round((thisWeekSessions / weeklyTarget) * 100));
      
      // Calculate completion rate (based on successful interactions)
      const successfulInteractions = interactions.filter(i => i.type === 'text' || i.type === 'voice').length;
      stats.completionRate = interactions.length > 0 ? Math.round((successfulInteractions / interactions.length) * 100) : 0;
      
      // Calculate average session time
      stats.averageSessionTime = interactions.length > 0 ? Math.round(totalMinutes / interactions.length) + 'm' : '0m';
      
      // Total sessions
      stats.totalSessions = interactions.length;
    }
  } catch (error) {
    console.error('Error loading progress data:', error);
  }
  
  try {
    res.render('progress', { progress, stats, currentRoute: 'progress' });
  } catch (error) {
    console.error('Error rendering progress:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/settings', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const settings = await models.Settings.findOne({ where: { userId: req.session.userId } }) || { language: 'en', voiceSpeed: 1.0, autoSpeak: false };
  
  // Load student data from JSON file
  let studentData = {};
  try {
    const studentsPath = path.join(__dirname, '../data/students.json');
    const studentsFile = fs.readFileSync(studentsPath, 'utf8');
    const students = JSON.parse(studentsFile);
    const userId = req.session.userId || 'user_hehxzwj55vhmd0u2mriz1';
    studentData = students[userId] || {};
  } catch (error) {
    console.error('Error loading student data:', error);
  }
  
  res.render('settings', { settings, student: studentData, currentRoute: 'settings' });
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

// Vocabulary page route
router.get('/vocabulary', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  
  let vocabularyData = {
    words: [],
    totalWords: 0,
    masteredWords: 0
  };
  
  try {
    // Get all vocabulary words for the user from database
    const words = await models.Vocabulary.findAll({
      where: { userId: req.session.userId },
      order: [['createdAt', 'DESC']]
    });
    
    const totalWords = words.length;
    const masteredWords = words.filter(word => word.masteryLevel >= 80).length;
    
    vocabularyData = {
      words: words,
      totalWords: totalWords,
      masteredWords: masteredWords
    };
  } catch (error) {
    console.error('Error loading vocabulary:', error);
  }
  
  res.render('vocabulary', { vocabulary: vocabularyData, currentRoute: 'vocabulary' });
});

// Goals page route
router.get('/goals', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  
  let goalsData = {
    activeGoals: [],
    completedGoals: []
  };
  
  try {
    // Fetch goals from database
    const allGoals = await models.Goal.findAll({
      where: { userId: req.session.userId },
      order: [['createdAt', 'DESC']]
    });
    
    goalsData.activeGoals = allGoals.filter(goal => !goal.isCompleted);
    goalsData.completedGoals = allGoals.filter(goal => goal.isCompleted);
  } catch (error) {
    console.error('Error loading goals:', error);
  }
  
  res.render('goals', { goals: goalsData, currentRoute: 'goals' });
});

// Usage dashboard route
router.get('/usage', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  
  try {
    const user = await models.User.findByPk(req.session.userId);
    if (!user) return res.redirect('/login');
    
    res.render('usage-dashboard', { user, currentRoute: 'usage' });
  } catch (error) {
    console.error('Error rendering usage dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Pronunciation practice page
router.get('/pronunciation', (req, res) => {
  res.render('pronunciation', { currentRoute: 'pronunciation' });
});

module.exports = router;