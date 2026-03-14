const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const sharedsession = require('express-socket.io-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Standardized API response utilities
const apiResponse = require('./utils/apiResponse');
const { requireJwtAuth } = require('./middleware/jwtMiddleware');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Security middleware
const { securityHeaders } = require('./middleware/securityHeaders');
const { authLimiter, generalLimiter, chatLimiter, ttsLimiter } = require('./middleware/rateLimiter');
const { sanitizeInputs } = require('./middleware/validators');

// ============================================================================
// ENVIRONMENT VALIDATION (OWASP: Fail securely)
// ============================================================================
const requiredEnvVars = ['SESSION_SECRET', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const optionalEnvVars = ['GEMINI_API_KEY', 'ELEVENLABS_API_KEY', 'HUGGINGFACE_API_TOKEN'];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`ERROR: Required environment variable ${varName} is not set!`);
    process.exit(1);
  }
});

optionalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`WARNING: Optional environment variable ${varName} is not set. Some features may be disabled.`);
  }
});

// ============================================================================
// APP INITIALIZATION
// ============================================================================
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
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

app.use(sessionMiddleware);
io.use(sharedsession(sessionMiddleware, { autoSave: true }));

// ============================================================================
// SECURITY MIDDLEWARE (applied first)
// ============================================================================

// Apply security headers to all responses
app.use(securityHeaders);

// Apply general rate limiting to all API requests
app.use('/api', generalLimiter);

// Sanitize all incoming request bodies
app.use(sanitizeInputs);

// Trust proxy for correct IP detection behind reverse proxies
app.set('trust proxy', 1);

// ============================================================================
// STANDARD MIDDLEWARE
// ============================================================================

// CORS configuration for Next.js frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


app.use(bodyParser.json({ limit: '1mb' })); // Limit body size
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================================
// API DOCUMENTATION (Swagger UI)
// ============================================================================
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Swagger UI available at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ESL Chatbot API Docs'
}));

// JSON spec available at /api/docs.json
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================================================
// API ROUTES
// ============================================================================
const authRoutes = require('./routes/sessionAuthRoutes');
const jwtAuthRoutes = require('./routes/jwtAuthRoutes');
const apiRoutes = require('./routes/apiRoutes');

// Session-based auth routes
app.use('/api/auth', authLimiter, authRoutes);
// JWT-based auth routes
app.use('/api/auth/jwt', authLimiter, jwtAuthRoutes);
app.use('/api', apiRoutes);

// Simple health check (detailed check with service status lives in apiRoutes.js)
app.get('/api/health', (req, res) => {
  return apiResponse.success(res, {
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

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
      const username = socket.handshake.session.user?.username;

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
