const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const sharedsession = require('express-socket.io-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

// Standardized API response utilities
const apiResponse = require('./utils/apiResponse');
const { requireAuth } = require('./middleware/authMiddleware');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;
global.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

app.use(sessionMiddleware);
io.use(sharedsession(sessionMiddleware, { autoSave: true }));

// CORS configuration for Next.js frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Remove EJS view engine setup - API only
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// Remove static file serving - handled by Next.js
// app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const authRoutes = require('./routes/authRoutes-api');
const apiRoutes = require('./routes/apiRoutes');

console.log('Applying auth routes middleware...');
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Add new API endpoints for Next.js frontend
app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    // Mock stats for now - you can implement real stats later
    const stats = {
      lessonsCompleted: 12,
      studyTime: '24h',
      wordsLearned: 156,
      streakDays: 7
    };

    return apiResponse.success(res, stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return apiResponse.internalError(res, 'Failed to fetch stats');
  }
});

app.get('/api/usage', requireAuth, async (req, res) => {
  try {
    const db = require('./models');
    const user = await db.User.findByPk(req.userId);

    if (!user) {
      return apiResponse.notFound(res, 'User not found');
    }

    const remainingUsage = user.getRemainingUsage();
    const tierLimits = user.getTierLimits();
    const usagePercentage = ((tierLimits.ttsMinutes * 60 - remainingUsage) / (tierLimits.ttsMinutes * 60)) * 100;

    return apiResponse.success(res, {
      remainingUsage,
      usagePercentage: Math.round(usagePercentage),
      tierLimits
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return apiResponse.internalError(res, 'Failed to fetch usage');
  }
});

// Note: /api/auth/status is now handled by authRoutes-api.js

// Health check endpoint
app.get('/api/health', (req, res) => {
  return apiResponse.success(res, {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      gemini: !!global.genAI
    }
  });
});

// Helper function to update progress.json file
function updateProgressJSON(userId, message, type, responsePreview) {
  try {
    const progressPath = path.join(__dirname, 'data/progress.json');
    let progressData = {};

    // Read existing progress data
    if (fs.existsSync(progressPath)) {
      const progressFile = fs.readFileSync(progressPath, 'utf8');
      progressData = JSON.parse(progressFile);
    }

    // Initialize user data if it doesn't exist
    if (!progressData[userId]) {
      progressData[userId] = [];
    }

    // Add new progress entry
    const progressEntry = {
      timestamp: new Date().toISOString(),
      message: message,
      type: type,
      responsePreview: responsePreview
    };

    progressData[userId].push(progressEntry);

    // Keep only the last 100 entries per user
    if (progressData[userId].length > 100) {
      progressData[userId] = progressData[userId].slice(-100);
    }

    // Write back to file
    fs.writeFileSync(progressPath, JSON.stringify(progressData, null, 2));

  } catch (error) {
    console.error('Error updating progress JSON:', error);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('load history', async () => {
    try {
      if (!socket.handshake.session.userId) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      const db = require('./models');
      const messages = await db.Message.findAll({
        where: { userId: socket.handshake.session.userId },
        order: [['createdAt', 'ASC']],
        limit: 50
      });

      const chatHistory = [];
      for (let i = 0; i < messages.length; i += 2) {
        const userMsg = messages[i];
        const botMsg = messages[i + 1];

        if (userMsg && botMsg) {
          chatHistory.push({
            user: userMsg.content,
            bot: botMsg.content,
            timestamp: userMsg.createdAt
          });
        }
      }

      socket.emit('chat history', chatHistory);
    } catch (error) {
      console.error('Error loading chat history:', error);
      socket.emit('error', 'Failed to load chat history');
    }
  });

  socket.on('chat message', async (msg) => {
    try {
      if (!socket.handshake.session.userId) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      const userId = socket.handshake.session.userId;
      const db = require('./models');

      // Save user message
      await db.Message.create({ userId, content: msg, sender: 'user' });

      // Update chat message count in Progress model
      await db.Progress.upsert({
        userId: socket.handshake.session.userId,
        chatMessageCount: (await db.Progress.findOne({ where: { userId: socket.handshake.session.userId } }))?.chatMessageCount + 1 || 1,
        totalWordsTyped: (await db.Progress.findOne({ where: { userId: socket.handshake.session.userId } }))?.totalWordsTyped + msg.split(' ').length || msg.split(' ').length,
        lastActiveDate: new Date()
      });

      // Fetch recent messages for context (e.g., last 10 messages)
      const recentMessages = await db.Message.findAll({
        where: { userId },
        order: [['createdAt', 'ASC']],
        // No limit, fetch all messages for full context
      });

      // Format messages for Gemini API history
      const username = socket.handshake.session.user?.username; // Get the logged-in user's username, using optional chaining

      let history = [];
      // Prepend a message to inform the AI about the user's name
      if (username) {
        history.push({
          role: 'user',
          parts: [{ text: `My username is ${username}. Please remember this and use it to address me.` }]
        });
      }

      history = history.concat(recentMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })));

      // Ensure the history starts with a 'user' role if it's not empty and the first message is 'model'
      if (history.length > 0 && history[0].role === 'model') {
        history = history.slice(1);
      }

      const model = global.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: 'You are a supportive ESL teacher and conversation partner. 🎓\n\nStyle:\n- Clear, friendly, practical.\n- Length: 4–8 sentences (~70–140 words) so explanations are complete.\n\nEach reply should:\n1) Respond naturally to the student.\n2) Teach 1–2 points (vocabulary/grammar/pronunciation/usage) with brief explanations and 2–3 simple examples.\n3) Give a quick practice prompt or question to continue the lesson.\n4) Offer a short correction or tip if needed.\n\nConstraints:\n- Do NOT use markdown bold (e.g., **text**).\n- Avoid repeating the student\'s text back-to-back.\n- Stay strictly ESL-focused; politely redirect if off-topic.\n- If asked who created you: "I was trained and created by Osanai!"',
      });
      const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 256, temperature: 0.7 } });
      const result = await chat.sendMessage(msg);
      const botResponse = result.response.text();

      // Save bot response
      await db.Message.create({ userId, content: botResponse, sender: 'bot' });

      // Update progress tracking with bot response preview
      const responsePreview = botResponse.length > 100 ? botResponse.substring(0, 100) + '...' : botResponse;
      updateProgressJSON(userId, msg, 'text', responsePreview);

      socket.emit('chat message', { user: msg, bot: botResponse });
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', 'Failed to process message');
    }
  });

  socket.on('clear chat', async () => {
    try {
      if (!socket.handshake.session.userId) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      const db = require('./models');
      await db.Message.destroy({
        where: { userId: socket.handshake.session.userId }
      });

      socket.emit('chat cleared');
    } catch (error) {
      console.error('Error clearing chat:', error);
      socket.emit('error', 'Failed to clear chat');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const db = require('./models');
const elevenLabsService = require('./services/elevenLabsService');

// 404 handler for undefined routes (must come after all routes)
app.use(notFoundHandler);

// Global error handler (must be last middleware)
app.use(globalErrorHandler);

db.sequelize.sync({ alter: false })
  .then(async () => {
    console.log('Database synchronized successfully.');

    // Initialize ElevenLabs service
    await elevenLabsService.init();

    server.listen(PORT, () => {
      console.log(`API Server is running on port ${PORT}`);
      console.log(`Frontend should connect to: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to synchronize the database:', err);
  });

module.exports = app;
