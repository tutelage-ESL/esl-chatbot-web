# ESL Chatbot Web — Backend

## Quick Start
```bash
# v1 server (api/v1 + EJS views, port 3001)
npm run dev

# v2 server (api/v2 + Swagger, port 3002)
npm run dev:v2

# Tests
npm test
```

## Two Servers

| Server | Entry | Port | Purpose |
|--------|-------|------|---------|
| v1 | `server.js` | 3001 | API v1 + EJS views. No Swagger. |
| v2 | `server.v2.js` | 3002 | API v2 + Swagger at `/api/docs`. |

Both servers share the same database and `src/models/`.

## Tech Stack
- **Runtime**: Node.js (Bun-compatible)
- **Framework**: Express 4
- **Database**: Sequelize ORM (SQLite dev / PostgreSQL prod / MySQL)
- **Auth**: JWT (access + refresh tokens) + session-based
- **Real-time**: Socket.IO (shared session with Express, v1 only)
- **AI**: Gemini 2.5 Flash (primary) → Ollama → rule-based fallback
- **TTS**: ElevenLabs (primary) → free fallback

## Required Environment Variables
```
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SESSION_SECRET=
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
PORT_V2=3002
```

## Architecture Overview

```
server.js            → v1 startup: db.sync → services → listen (port 3001)
server.v2.js         → v2 startup: db.sync → listen (port 3002)
src/
├── app.js           → v1 Express factory (api/v1 + EJS views, Socket.IO, NO swagger)
├── app.v2.js        → v2 Express factory (api/v2 + Swagger only)
│
├── api/
│   ├── v1/          → All v1 routes (one folder per domain)
│   │   ├── auth/           auth.routes, auth.controller, auth.service, auth.validation, auth.test
│   │   ├── users/          user.routes, user.controller, user.service, user.repository, user.validation, user.test
│   │   ├── learner-profile/ learnerProfile.routes, controller, service, validation, test
│   │   ├── subscriptions/  subscription.routes, controller, service, validation, test
│   │   ├── conversations/  conversation.routes, controller, service, repository, validation, test
│   │   ├── pronunciation/  pronunciation.routes, controller, service, repository, validation, test
│   │   ├── vocabulary/     vocabulary.routes, controller, service, repository, validation, test
│   │   ├── goals/          goal.routes, controller, service, repository, validation, test
│   │   ├── dashboard/      dashboard.routes, controller, service
│   │   ├── analytics/      analytics.routes, controller, service
│   │   ├── admin/          admin.routes, controller, service
│   │   └── index.js        → mounts all v1 routers
│   └── v2/
│       ├── health/         health.routes, health.controller  (Swagger annotated)
│       ├── status/         status.routes, status.controller  (Swagger annotated)
│       └── index.js        → mounts all v2 routers
│
├── models/          → Sequelize models (all canonical model files live here)
├── middleware/      → Shared middleware (auth, rbac, planGuard, validate, rateLimit, errorHandler, requestLogger)
├── services/        → External service wrappers (ai, elevenlabs, email, storage, cache, queue, sessionStore)
├── jobs/            → Background job stubs (evaluatePronunciation, evaluateMessage, updateUserMetrics, etc.)
├── events/          → EventEmitter bus + session/goal listeners
├── config/          → index.js (env config), database.js, redis.js, logger.js, cors.js, swagger.js (v2 only)
├── utils/           → ApiError, ApiResponse, asyncHandler, paginate, tokenHelper, sm2
├── constants/       → roles.js, plans.js, statusCodes.js, messages.js
└── sockets/         → chat.socket.js (Socket.IO real-time chat, v1 only)
```

## Layered Architecture per Domain

```
Route → Controller → Service → Repository → Model
```

| Layer | Responsibility |
|-------|---------------|
| **routes** | Wire middleware + call controller. No logic. |
| **controller** | Parse request, call service, return `apiResponse.*()`. |
| **service** | Business logic, orchestration. Calls repository or other services. |
| **repository** | All Sequelize queries. Returns plain model instances. |
| **validation** | Joi schemas for request input. |
| **test** | Jest + supertest. Stub-based, promote to integration tests over time. |

## User Roles

| Role | Created by | Key capabilities |
|------|-----------|-----------------|
| `admin` | System / seed | Registers tutors, views system-wide stats |
| `tutor` | Admin | Registers students, views their students' dashboards |
| `student` | Tutor | Learns via AI chat/voice; has subscription + learner profile |

Role hierarchy is encoded in two FK columns on `users`:
- `tutorId` — set on student rows, points to their owning tutor
- `adminId` — set on tutor rows, points to the admin who created them

## Data Models (`src/models/`)

### Core
| Model | Table | Description |
|-------|-------|-------------|
| `User` | `users` | Identity for all roles. Has `role`, `tutorId`, `adminId`. |

### Student-Only
| Model | Table | Description |
|-------|-------|-------------|
| `LearnerProfile` | `learner_profiles` | Level, learning purpose, topics, UI prefs, AI personality. |
| `Subscription` | `subscriptions` | Plan (free/basic/pro), TTS quota tracking. |
| `UserMetrics` | `user_metrics` | Live totals: streaks, study time, 6 skill scores (0–100). |

### Conversation & Messaging
| Model | Table | Description |
|-------|-------|-------------|
| `ConversationSession` | `conversation_sessions` | Groups messages. Has `mode`, AI-generated `summary`. |
| `Message` | `messages` | Single turn. `role` = user | assistant. `aiEvaluation` JSON inline. |

### Learning Content
| Model | Table | Description |
|-------|-------|-------------|
| `Vocabulary` | `vocabularies` | Saved words with SRS fields (srsInterval, srsDue, srsEase). |
| `Goal` | `goals` | Learning objectives. `assignedByTutorId` set when tutor creates goal. |
| `Progress` | `progress` | **Daily snapshot ledger** — one row per student per day. |

## Key Architectural Rules
1. **No logic in routes** — routes only wire middleware + call controller.
2. **Always use `apiResponse`** helpers (`apiResponse.success`, `.notFound`, etc.) from `src/utils/ApiResponse.js`.
3. **All env access through `src/config/index.js`** — never read `process.env` directly in controller or service files.
4. **async/await only** — no raw promise chains in new code.
5. **`server.js` and `server.v2.js` must stay thin** — only startup sequence, nothing else.
6. **Student-only checks** — `LearnerProfile` and `Subscription` must only be created/queried for `role = 'student'`.
7. **Progress upserts** — use `upsert` on `(userId, date)` when writing daily progress to avoid duplicate rows.
8. **Two servers** — v1 has no Swagger; v2 has Swagger covering only v2 endpoints.

## v1 API Routes (`/api/...`)

| Domain | Path | Notes |
|--------|------|-------|
| Auth | `/api/auth` | Session + JWT auth (mounted with `authLimiter`) |
| Users | `/api/users` | Profile, tutor's student list |
| Learner Profile | `/api/profile` | Student learning preferences (student-only) |
| Subscriptions | `/api/subscriptions` | Plan & TTS quota (student-only) |
| Conversations | `/api/conversations` | AI chat, message history |
| Pronunciation | `/api/pronunciation` | Pronunciation analysis |
| Vocabulary | `/api/vocabulary` | Vocabulary with SRS flashcard system |
| Goals | `/api/goals` | Learning objective CRUD |
| Dashboard | `/api/dashboard` | Student stats & metrics |
| Analytics | `/api/analytics` | Progress history for charts |
| Admin | `/api/admin` | Admin panel (admin-only) |

## v2 API Routes (`/api/v2/...`)
Swagger docs: `GET /api/docs` (only on v2 server, port 3002)

| Domain | Path | Notes |
|--------|------|-------|
| Health | `/api/v2/health` | Liveness check |
| Status | `/api/v2/status` | Service status, `/ping` endpoint |
