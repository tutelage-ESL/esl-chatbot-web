# ESL Chatbot — Backend

Node.js + Express REST API for the ESL chatbot platform. Handles auth, AI conversations, vocabulary SRS, TTS, and student progress tracking.

---

## Quick Start

```bash
# Install dependencies
npm install

# v1 server — API v1 + EJS views (port 3001)
npm run dev

# v2 server — API v2 + Swagger docs (port 3002)
npm run dev:v2

# Tests
npm test
```

---

## Two Servers

The backend runs as two independent servers that share the same database.

| Server | Command | Port | Contents |
|--------|---------|------|----------|
| **v1** | `npm run dev` | 3001 | `api/v1` + EJS views + Socket.IO real-time chat |
| **v2** | `npm run dev:v2` | 3002 | `api/v2` + Swagger UI at `/api/docs` |

---

## Environment Variables

**Required:**
```
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SESSION_SECRET=
```

**Optional:**
```
GEMINI_API_KEY=            # Primary AI (Gemini 2.5 Flash)
ELEVENLABS_API_KEY=        # Premium TTS
HUGGINGFACE_API_TOKEN=
GROQ_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_URL=
DATABASE_URL=              # PostgreSQL connection string
FRONTEND_URL=http://localhost:3000
PORT=3001
PORT_V2=3002
```

---

## Directory Structure

```
backend/
├── server.js              # v1 startup (db.sync → services → listen)
├── server.v2.js           # v2 startup (db.sync → listen)
│
├── src/
│   ├── app.js             # v1 Express factory (api/v1 + views + Socket.IO)
│   ├── app.v2.js          # v2 Express factory (api/v2 + Swagger)
│   │
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth/            Session + JWT authentication
│   │   │   ├── users/           User profile & tutor student management
│   │   │   ├── learner-profile/ Student learning preferences
│   │   │   ├── subscriptions/   Plan & TTS quota (student-only)
│   │   │   ├── conversations/   AI chat & message history
│   │   │   ├── pronunciation/   Pronunciation analysis
│   │   │   ├── vocabulary/      Vocab builder + SRS flashcards
│   │   │   ├── goals/           Learning objective CRUD
│   │   │   ├── dashboard/       Student stats & metrics
│   │   │   ├── analytics/       Progress history for charts
│   │   │   ├── admin/           Admin panel (admin-only)
│   │   │   └── index.js         Router mount point
│   │   └── v2/
│   │       ├── health/          Liveness check
│   │       ├── status/          Service status + ping
│   │       └── index.js
│   │
│   ├── models/            Sequelize ORM models
│   ├── middleware/        auth, rbac, planGuard, validate, rateLimiter, errorHandler, requestLogger
│   ├── services/          ai, elevenlabs, email, storage, cache, queue, sessionStore
│   ├── jobs/              Background job stubs (evaluatePronunciation, updateUserMetrics, etc.)
│   ├── events/            EventEmitter bus + session/goal listeners
│   ├── config/            index (env), database, redis, logger, cors, swagger (v2)
│   ├── utils/             ApiError, ApiResponse, asyncHandler, paginate, tokenHelper, sm2
│   ├── constants/         roles, plans, statusCodes, messages
│   └── sockets/           chat.socket (Socket.IO, v1 only)
│
├── config/
│   └── config.json        Sequelize dialect config (dev/test/prod)
├── seeders/               Dev data seeders
├── views/                 EJS templates (served by v1)
└── public/                Static assets
```

---

## Architecture: Route → Controller → Service → Repository

Each `api/v1` domain follows this layered pattern:

```
routes.js       Wire middleware, call controller. No logic.
controller.js   Parse request, call service, return apiResponse.*()
service.js      Business logic, orchestration. Calls repositories.
repository.js   All Sequelize queries. Returns model instances.
validation.js   Joi schemas for request input.
test.js         Jest tests (stubs → integration over time).
```

---

## Authentication

Two auth systems coexist in v1:

**Session-based** (`/api/auth/signup`, `/login`, `/logout`)
- Uses `express-session`
- For traditional web flows (EJS pages)

**JWT-based** (`/api/auth/jwt/signup`, `/signin`, `/refresh`, `/logout`)
- Access token (20 min) + Refresh token (30 days)
- For SPA / mobile clients

---

## AI Fallback Chain

Conversations use a priority chain (first available wins):

1. **Gemini 2.5 Flash** (primary, requires `GEMINI_API_KEY`)
2. **Ollama** (local, requires `OLLAMA_URL`)
3. **Rule-based fallback** (always available)

---

## User Roles

| Role | Created by | Capabilities |
|------|-----------|-------------|
| `admin` | System / seed | Manages tutors, views system stats |
| `tutor` | Admin | Manages students, assigns goals |
| `student` | Tutor | Chat, vocabulary, progress tracking |

---

## API v2 Docs

Run `npm run dev:v2` then open: `http://localhost:3002/api/docs`
