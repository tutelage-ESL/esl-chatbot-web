# ESL Chatbot Web — Backend

## Quick Start
```bash
cd backend
npm run dev     # nodemon server.js
npm test        # jest --coverage
```

## Tech Stack
- **Runtime**: Node.js (Bun-compatible)
- **Framework**: Express 4
- **Database**: Sequelize ORM (SQLite dev / PostgreSQL prod / MySQL)
- **Auth**: Session-based (`express-session`) + JWT (access + refresh tokens)
- **Real-time**: Socket.IO (shared session with Express)
- **AI**: Gemini 2.5 Flash (primary) → Ollama → Groq → HuggingFace → OpenRouter → rule-based
- **TTS**: ElevenLabs (primary) → Google Translate TTS (free fallback)

## Required Environment Variables
```
SESSION_SECRET=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

## Optional Environment Variables
```
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
HUGGINGFACE_API_TOKEN=
GROQ_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_URL=
DATABASE_URL=
FRONTEND_URL=http://localhost:3000
PORT=3001
```

## Architecture Overview
```
server.js          → ONLY: db.sync + service.init + listen
src/app.js         → Express setup: middleware, routes, Socket.IO
src/api/v1/        → All versioned API routes (one folder per domain)
src/config/        → Centralized config (read env here, not in business logic)
src/sockets/       → Socket.IO event handlers
middleware/        → Shared middleware (auth, rate-limit, validation, error)
models/            → Sequelize models (already well-structured, don't move)
services/          → External service wrappers (ElevenLabs, tokenService)
utils/             → Pure helpers (apiResponse, etc.)
```

## Key Architectural Rules
1. **No logic in routes** — routes only wire middleware + call controller methods.
2. **Always use `apiResponse`** helpers (`apiResponse.success`, `.notFound`, etc.) for consistent JSON shape.
3. **All env access through `src/config/index.js`** — never read `process.env` directly in controller or service files.
4. **async/await only** — no raw promise chains in new code.
5. **`server.js` must stay thin** — only startup sequence, nothing else.

## API Docs
Available at `GET /api/docs` (Swagger UI) when running locally.
