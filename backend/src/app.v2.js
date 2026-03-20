'use strict';
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const bodyParser = require('body-parser');
const swaggerUi  = require('swagger-ui-express');

const corsOptions       = require('./config/cors');
const swaggerSpec       = require('./config/swagger');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');
const requestLogger     = require('./middleware/requestLogger.middleware');

const app    = express();
const server = http.createServer(app);

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestLogger);
app.use((req, res, next) => { res.removeHeader('X-Powered-By'); next(); });

// ── Swagger UI (v2 only) ──────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ESL Chatbot API v2 Docs'
}));
app.get('/api/docs.json', (req, res) => { res.setHeader('Content-Type', 'application/json'); res.send(swaggerSpec); });

// ── API v2 routes ─────────────────────────────────────────────────────────────
app.use('/api/v2', require('./api/v2'));

// ── 404 + error handler ───────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = { app, server };
