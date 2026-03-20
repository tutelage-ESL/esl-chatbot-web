'use strict';
require('dotenv').config();

const express    = require('express');
const http       = require('http');
const socketIo   = require('socket.io');
const sharedsession = require('express-socket.io-session');
const cors       = require('cors');
const bodyParser = require('body-parser');
const session    = require('express-session');
const path       = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const config           = require('./config');
const corsOptions      = require('./config/cors');
const { authLimiter, generalLimiter } = require('./middleware/rateLimiter.middleware');
const { sanitizeInputs } = require('./middleware/validate.middleware');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');
const requestLogger    = require('./middleware/requestLogger.middleware');

// ── ENV validation ────────────────────────────────────────────────────────────
['SESSION_SECRET', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].forEach(v => {
  if (!process.env[v]) { console.error(`ERROR: Required env var ${v} is not set!`); process.exit(1); }
});
['GEMINI_API_KEY', 'ELEVENLABS_API_KEY'].forEach(v => {
  if (!process.env[v]) console.warn(`WARNING: Optional env var ${v} not set.`);
});

// ── Global AI client ──────────────────────────────────────────────────────────
global.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ── Express + HTTP + Socket.IO ────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, { cors: { origin: config.frontendUrl, methods: ['GET','POST'], credentials: true } });

// ── Session ───────────────────────────────────────────────────────────────────
const sessionMiddleware = session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: config.env === 'production', httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
});
app.use(sessionMiddleware);
io.use(sharedsession(sessionMiddleware, { autoSave: true }));

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const { registerChatSocket } = require('./sockets/chat.socket');
registerChatSocket(io);

// ── Security headers ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(self)');
  res.removeHeader('X-Powered-By');
  if (config.env === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use('/api', generalLimiter);
app.use(sanitizeInputs);
app.set('trust proxy', 1);

// ── Standard middleware ───────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestLogger);

// ── EJS views ─────────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// ── API v1 routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./api/v1/auth/auth.routes'));
app.use('/api', require('./api/v1'));

// ── 404 + error handler ───────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = { app, server, io };
