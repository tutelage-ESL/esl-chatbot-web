# ESL Chatbot — Backend

The backend is a Node.js + Express REST API server that powers the ESL chatbot frontend. It handles authentication, AI-driven conversations, vocabulary management, text-to-speech, and user progress tracking.

---

## Quick Start

```bash
# Install dependencies (uses Bun)
bun install

# Start in development mode (auto-restarts on file changes)
nodemon server.js
# — or —
bun run dev

# Start in production mode
node server.js
# — or —
bun run start

# Run tests
bun test
```

> **Default port:** `3001`
> **Frontend expects:** `http://localhost:3001`

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | ✅ | Secret for `express-session` cookie signing |
| `JWT_ACCESS_SECRET` | ✅ | Secret for JWT access token signing |
| `JWT_REFRESH_SECRET` | ✅ | Secret for JWT refresh token signing |
| `GEMINI_API_KEY` | ⚠️ | Google Gemini API key (primary AI provider) |
| `ELEVENLABS_API_KEY` | ⚠️ | ElevenLabs API key for text-to-speech |
| `HUGGINGFACE_API_TOKEN` | ⚠️ | HuggingFace token (AI fallback) |
| `DATABASE_URL` | ⚠️ | PostgreSQL connection URL (auto-detected) |
| `FRONTEND_URL` | — | Frontend origin for CORS (default: `http://localhost:3000`) |
| `PORT` | — | Server port (default: `3001`) |
| `NODE_ENV` | — | `development` or `production` |
| `PUBLIC_EVENT_MODE` | — | Set to `"true"` to auto-login as event user |

> ⚠️ = Optional but some features will be disabled without it.

---

## Project Structure

```
backend/
├── server.js               # ← Active entry point (JWT + REST API)
├── server-legacy.js        # ← Legacy EJS server (session-based, NOT active)
├── package.json
│
├── config/
│   ├── config.json         # Sequelize database config per environment
│   └── swagger.js          # Swagger/OpenAPI spec builder
│
├── controllers/
│   ├── jwtAuthController.js      # JWT signup, signin, refresh, logout, profile
│   ├── sessionAuthController.js  # Session-based signup/login (active API)
│   └── authController.js         # LEGACY — EJS view rendering (not active)
│
├── routes/
│   ├── apiRoutes.js              # Main API routes (chat, TTS, vocabulary, progress, goals…)
│   ├── jwtAuthRoutes.js          # /api/auth/jwt/* routes
│   ├── sessionAuthRoutes.js      # /api/auth/* routes (session-based for frontend)
│   ├── mainRoutes.js             # LEGACY — EJS view routes (not active)
│   └── authRoutes.js             # LEGACY — EJS auth routes (not active)
│
├── middleware/
│   ├── jwtMiddleware.js    # requireJwtAuth / optionalJwtAuth
│   ├── rateLimiter.js      # Per-route rate limits (auth, chat, TTS, general)
│   ├── securityHeaders.js  # OWASP security headers (Helmet-style)
│   ├── validators.js       # Joi schemas + XSS sanitization
│   ├── errorHandler.js     # Global error handler + 404 handler
│   └── authMiddleware.js   # Session-based auth guard (legacy)
│
├── models/
│   ├── index.js            # Sequelize setup, model loader, associations
│   ├── User.js             # User + subscription tier + TTS usage tracking
│   ├── Message.js          # Chat messages (user↔bot)
│   ├── Progress.js         # Chat count and word stats per user
│   ├── Vocabulary.js       # User's vocabulary words with mastery tracking
│   ├── Goal.js             # User learning goals
│   ├── Interaction.js      # Timestamped interaction log
│   ├── UserMetrics.js      # Aggregated skill metrics
│   └── Settings.js         # Per-user language/voice settings
│
├── services/
│   ├── elevenLabsService.js  # ElevenLabs TTS + STT (singleton)
│   ├── tokenService.js       # JWT signing / verification helpers
│   └── sessionStore.js       # In-memory refresh token store
│
├── utils/
│   └── apiResponse.js      # Standardized response helpers (success, error, etc.)
│
├── docs/
│   ├── JWT_AUTH.md         # JWT authentication flow documentation
│   ├── schema.sql          # Database schema reference
│   └── swagger-routes.js   # Swagger JSDoc annotations
│
├── migrations/             # Sequelize migration files
├── tests/                  # Jest integration tests
├── data/                   # JSON data files (progress.json, students.json)
└── uploads/                # Multer file upload directory
```

---

## Key Components & How They Interact

```
Frontend (React)
      │
      │  HTTP REST + Socket.IO
      ▼
server.js ──────────────────────────────────────────┐
  │  Express middleware stack:                       │
  │  securityHeaders → rateLimiter → sanitizeInputs  │
  │  → session → CORS → bodyParser                   │
  │                                                  │
  ├── /api/auth/*         sessionAuthRoutes.js        │
  ├── /api/auth/jwt/*     jwtAuthRoutes.js            │
  ├── /api/*              apiRoutes.js ───────────────┤
  │                                                  │
  │  Socket.IO (chat via WebSocket)                  │
  └── io.on('chat message') → Gemini AI              │
                                                     │
                    ┌────────────────────────────────┘
                    │
              Services & Models
              ├── elevenLabsService   → ElevenLabs API (TTS/STT)
              ├── tokenService        → JWT sign/verify
              ├── sessionStore        → Refresh token store
              └── models (Sequelize)  → PostgreSQL / SQLite
```

### AI Fallback Chain (chat endpoint)
When the primary Gemini API fails, the system tries these in order:
1. **Ollama** (local LLM, if `OLLAMA_URL` is set)
2. **Groq** (if `GROQ_API_KEY` is set)
3. **HuggingFace** (if `HUGGINGFACE_API_TOKEN` is set)
4. **OpenRouter** (if `OPENROUTER_API_KEY` is set)
5. **Rule-based** (hardcoded ESL tutor fallback responses)

---

## API Overview

Swagger UI is available at: **`http://localhost:3001/api/docs`**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | — | Create account (session auth) |
| POST | `/api/auth/login` | — | Login (session auth) |
| POST | `/api/auth/jwt/signup` | — | Create account + get JWT tokens |
| POST | `/api/auth/jwt/signin` | — | Login + get JWT tokens |
| POST | `/api/auth/jwt/refresh` | — | Rotate JWT tokens |
| GET | `/api/auth/jwt/profile` | JWT | Get current user profile |
| POST | `/api/chat` | JWT | Send message to AI tutor |
| GET | `/api/progress` | JWT | Get user progress stats |
| GET/POST | `/api/vocabulary` | JWT | Manage vocabulary words |
| GET/POST | `/api/goals` | JWT | Manage learning goals |
| POST | `/api/text-to-speech` | — | Generate speech audio (ElevenLabs) |
| GET | `/api/voices` | — | List available TTS voices |
| GET | `/api/health` | — | Server health status |
| GET | `/api/dashboard/stats` | JWT | Dashboard stats |
| GET | `/api/usage` | JWT | TTS usage and limits |

See [`../docs/api.md`](../docs/api.md) for detailed request/response shapes.

---

## Active vs. Legacy Code

The backend evolved from an EJS server-side-rendering approach to a pure REST API. The legacy code is **kept for reference** but not active:

| File | Status |
|------|--------|
| `server.js` | ✅ **Active** — JWT + REST API |
| `server-legacy.js` | 🔴 Legacy — EJS/session-based |
| `routes/sessionAuthRoutes.js` | ✅ Active |
| `routes/jwtAuthRoutes.js` | ✅ Active |
| `routes/apiRoutes.js` | ✅ Active |
| `routes/mainRoutes.js` | 🔴 Legacy |
| `routes/authRoutes.js` | 🔴 Legacy |
| `controllers/sessionAuthController.js` | ✅ Active |
| `controllers/jwtAuthController.js` | ✅ Active |
| `controllers/authController.js` | 🔴 Legacy |
