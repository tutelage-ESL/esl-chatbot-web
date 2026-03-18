'use strict';

/**
 * src/app.js
 * Express app factory — sets up all middleware, routes.
 * Does NOT call db.sync or server.listen (those live in server.js).
 * Exports { app, server, io } so server.js and tests can use them.
 */

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const socketIo   = require('socket.io');
const sharedsession = require('express-socket.io-session');
const cors       = require('cors');
const bodyParser = require('body-parser');
const session    = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const swaggerUi  = require('swagger-ui-express');

const config          = require('./config');
const swaggerSpec     = require('../config/swagger');
const apiResponse     = require('../utils/apiResponse');

// Middleware
const { securityHeaders }  = require('../middleware/securityHeaders');
const { authLimiter, generalLimiter } = require('../middleware/rateLimiter');
const { sanitizeInputs }   = require('../middleware/validators');
const { globalErrorHandler, notFoundHandler } = require('../middleware/errorHandler');

// ─── Environment validation ───────────────────────────────────────────────────
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
    console.warn(`WARNING: Optional env var ${varName} not set. Some features may be disabled.`);
  }
});

// ─── Initialise global AI client ─────────────────────────────────────────────
global.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Express + HTTP + Socket.IO ──────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ─── Session middleware (shared with Socket.IO) ───────────────────────────────
const sessionMiddleware = session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.env === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
});

app.use(sessionMiddleware);
io.use(sharedsession(sessionMiddleware, { autoSave: true }));

// ─── Register Socket.IO handlers ─────────────────────────────────────────────
const { registerChatSocket } = require('./sockets/chat.socket');
registerChatSocket(io);

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(securityHeaders);
app.use('/api', generalLimiter);
app.use(sanitizeInputs);
app.set('trust proxy', 1);

// ─── Standard middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// ─── Swagger API docs ─────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ESL Chatbot API Docs'
}));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── Auth routes (with rate limiter applied here) ────────────────────────────
const { authLimiter: al } = require('../middleware/rateLimiter');
app.use('/api/auth',      al, require('./api/v1/auth/auth.routes'));

// ─── All other v1 API routes ─────────────────────────────────────────────────
app.use('/api', require('./api/v1'));

// ─── 404 + global error ───────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = { app, server, io };
