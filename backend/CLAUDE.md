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
server.js                   → ONLY: db.sync + service.init + listen
src/app.js                  → Express setup: middleware, routes, Socket.IO
src/api/v1/                 → All versioned API routes (one folder per domain)
src/config/                 → Centralized config (read env here, not in business logic)
src/sockets/                → Socket.IO event handlers
middleware/                 → Shared middleware (auth, rate-limit, validation, error)
models/                     → Sequelize models (see Data Model section below)
services/                   → External service wrappers (ElevenLabs, tokenService)
utils/                      → Pure helpers (apiResponse, etc.)
```

## User Roles
Three roles exist — each with a different account lifecycle:

| Role    | Created by | Key capabilities |
|---------|-----------|-----------------|
| `admin` | System / seed | Registers tutors, views everything in the system |
| `tutor` | Admin | Registers students, views their students' dashboards |
| `student` | Tutor | Learns via AI chat/voice; has subscription + learner profile |

Role hierarchy is encoded in two FK columns on `users`:
- `tutorId` — set on student rows, points to their owning tutor
- `adminId` — set on tutor rows, points to the admin who created them

## Data Models

### Core
| Model | Table | Description |
|-------|-------|-------------|
| `User` | `users` | Identity for all roles (student / tutor / admin). Has `role`, `tutorId`, `adminId`, `phone`, `nativeLanguage`. |

### Student-Only
| Model | Table | Description |
|-------|-------|-------------|
| `LearnerProfile` | `learner_profiles` | Level, learning purpose, topics, UI preferences (theme, language, aiPersonality). Replaces old `Settings`. |
| `Subscription` | `subscriptions` | Plan (free / basic / pro), TTS quota tracking, billing period. Tutors and admins have no subscription row. |
| `UserMetrics` | `user_metrics` | Live running totals: streaks, study time, skill scores (6 × 0–100). Updated incrementally. |

### Conversation & Messaging
| Model | Table | Description |
|-------|-------|-------------|
| `ConversationSession` | `conversation_sessions` | Groups messages into one session. Has `mode` (text/voice/lesson/pronunciation), AI-generated `summary`, `topic`, and aggregate stats. |
| `Message` | `messages` | Single turn. `role` = user | assistant. `inputMode` = text | voice. `aiEvaluation` JSON holds grammar/pronunciation feedback inline. |

### Learning Content
| Model | Table | Description |
|-------|-------|-------------|
| `Vocabulary` | `vocabularies` | Saved words with SRS fields (srsInterval, srsDue, srsEase) for flashcard scheduling. |
| `Goal` | `goals` | Learning objectives. `assignedByTutorId` is set when a tutor creates the goal. |
| `Progress` | `progress` | **Daily snapshot ledger** — one row per student per day. Used for analytics charts and tutor dashboards. |

### Removed Models
| Model | Replacement |
|-------|------------|
| `Settings` | → `LearnerProfile` |
| `Interaction` | → `ConversationSession` + `Message` + `Progress` |

## Key Architectural Rules
1. **No logic in routes** — routes only wire middleware + call controller methods.
2. **Always use `apiResponse`** helpers (`apiResponse.success`, `.notFound`, etc.) for consistent JSON shape.
3. **All env access through `src/config/index.js`** — never read `process.env` directly in controller or service files.
4. **async/await only** — no raw promise chains in new code.
5. **`server.js` must stay thin** — only startup sequence, nothing else.
6. **Student-only checks** — `LearnerProfile` and `Subscription` must only be created/queried for users where `role = 'student'`.
7. **Progress upserts** — use `upsert` on `(userId, date)` when writing daily progress to avoid duplicate rows.

## API Docs
Available at `GET /api/docs` (Swagger UI) when running locally.

New API tags added: **Tutor**, **Admin**, **Profile**
- `GET/PUT /api/profile` — student learner profile
- `GET/POST /api/tutor/students` — tutor student management
- `GET /api/tutor/students/:id/progress` — student progress (date range)
- `POST /api/tutor/students/:id/goals` — assign a goal
- `GET /api/admin/tutors` — all tutors
- `POST /api/admin/tutors` — register a tutor
- `GET /api/admin/overview` — system-wide stats
