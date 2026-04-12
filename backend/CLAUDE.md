# CLAUDE.md — ESL Chatbot Backend

## Overview
AI-powered English learning platform backend. Supports student-tutor-admin hierarchy,
conversation sessions, vocabulary SRS, progress tracking, and subscription management.

---

## Tech Stack
- **Runtime:** Bun
- **Language:** TypeScript (strict mode)
- **Secrets:** Infisical (CLI-based injection — see `SECRETS.md`)
- **Framework:** Express.js 5
- **ORM:** Prisma 6 + PostgreSQL
- **Auth:** JWT (access + refresh tokens) + bcryptjs + Google OAuth (ID token verification via Google tokeninfo endpoint)
- **Cache:** Redis (placeholder — integrate later)
- **Email:** SendGrid (placeholder — integrate later)
- **File Uploads:** Multer
- **Realtime:** Socket.io (placeholder — integrate later)
- **Security:** Helmet, express-rate-limit, cors
- **Logging:** Winston + Morgan
- **API Docs:** Swagger (OpenAPI 3.0 via swagger-jsdoc)
- **Type Sharing:** openapi-typescript (generates `frontend/types/api.ts` from Swagger spec)
- **Validation:** Zod 4
- **IDs:** UUID v4 (Prisma @default(uuid()))

---

## Commands

> All commands below require Infisical CLI to be set up (`infisical login` + `infisical init`).
> For running without Infisical, use `bun run dev:env` / `bun run start:env` with a `.env` file.

```bash
bun dev                # Start dev server with --watch (via Infisical)
bun start              # Start production server (via Infisical)
bun run dev:env        # Start dev server without Infisical (needs .env file)
bun run start:env      # Start production server without Infisical (needs .env file)
bun run db:generate    # Generate Prisma client
bun run db:migrate     # Run Prisma migrations (via Infisical)
bun run db:push        # Push schema to DB (no migration) (via Infisical)
bun run db:seed        # Seed the database (via Infisical)
bun run db:studio      # Open Prisma Studio (via Infisical)
bun run typecheck      # TypeScript type check
bun run generate:openapi   # Export Swagger spec → openapi.json (backend root, gitignored)
bun run generate:types     # Full pipeline: openapi.json → ../frontend/types/api.ts
bun test               # Run all tests (requires DB running + seeded) (via Infisical)
bun run test:watch     # Run tests in watch mode (via Infisical)
```

---

## Frontend Type Sharing (openapi-typescript)

The backend shares TypeScript types with the Nuxt.js frontend via `openapi-typescript`.
No tRPC, no code generation framework — just types derived from the existing Swagger spec.

### How it works
```
Swagger JSDoc comments in routers
        ↓
  swagger-jsdoc → openapi.json   (backend root, gitignored)
        ↓
  openapi-typescript → ../frontend/types/api.ts   (committed)
```

### When to regenerate
Run after **any** route change: new endpoint, changed request body, changed response shape.
```bash
bun run generate:types
```
Commit `../frontend/types/api.ts` alongside your backend changes so the frontend stays in sync.

### Frontend usage (Nuxt.js)
Install the companion HTTP client in the frontend once:
```bash
bun add openapi-fetch   # inside esl-chatbot-web/frontend/
```

Then use it with full type safety:
```ts
import createClient from "openapi-fetch";
import type { paths } from "~/types/api";

const api = createClient<paths>({ baseUrl: "http://localhost:8000/api/v1" });

// Fully typed — request body and response are inferred automatically
const { data, error } = await api.POST("/auth/login", {
  body: { username: "student_ali", password: "password123" },
});
// data.user.role is typed as "STUDENT" | "TUTOR" | "ADMIN"
```

### Key rules
- **Never edit `frontend/types/api.ts` manually** — it is always regenerated
- `openapi.json` is gitignored (intermediate artifact); `frontend/types/api.ts` is committed
- Types are only as good as the Swagger JSDoc comments — keep them accurate
- `scripts/export-openapi.ts` injects placeholder env vars so no real DB/JWT secrets are needed to generate types

---

## Architecture: Modular Domain-Based (Layered)

```
src/
├── config/          # env, database, redis, sendgrid, swagger, logger
├── modules/         # domain modules
│   ├── auth/        # login, register, token refresh, password reset
│   ├── users/       # CRUD, profile management
│   ├── classes/     # create classes, manage class code lifecycle, join by code
│   ├── sessions/    # conversation session lifecycle
│   ├── messages/    # chat messages within sessions
│   ├── vocabulary/  # flashcards + SRS scheduling
│   ├── goals/       # learning objectives + tracking
│   ├── progress/    # daily snapshots
│   ├── metrics/     # aggregated dashboard stats
│   ├── subscriptions/ # plan + billing management
│   └── admin/       # admin-only operations
├── middlewares/      # authenticate, authorize, errorHandler, notFound, upload
├── utils/           # AppError, asyncHandler, apiResponse, pagination
├── routes/v1/       # mounts all module routers under /api/v1
├── types/           # express.d.ts (req.user augmentation)
├── jobs/            # cron job placeholders
├── socket/          # socket.io handler placeholder
├── app.ts           # Express setup, middleware stack, routes
└── index.ts         # Server entry point
```

### Module Internal Pattern
Each module under `src/modules/[name]/` follows:
```
[name].router.ts      # Express router with route definitions
[name].controller.ts  # Handles req/res, calls service
[name].service.ts     # Business logic, calls Prisma
[name].schema.ts      # Zod validation schemas
[name].types.ts       # TypeScript types/interfaces
```

---

## Database Schema

### Enums
| Enum | Values |
|------|--------|
| Role | STUDENT, TUTOR, ADMIN |
| AuthProvider | LOCAL, GOOGLE |
| ClassStatus | ACTIVE, INACTIVE |
| SessionMode | TEXT, VOICE |
| MessageRole | USER, ASSISTANT |
| MessageType | TEXT, VOICE |
| GoalStatus | ACTIVE, COMPLETED, PAUSED, CANCELLED |
| Plan | FREE, PREMIUM |
| SubStatus | ACTIVE, INACTIVE, CANCELLED, PAST_DUE |

### Models
| Model | Table | Key Relations |
|-------|-------|---------------|
| User | users | 1:1 profile/subscription/metrics, has many classUsers, has many createdClasses (TUTOR/ADMIN as creator) |
| Class | classes | has many ClassUsers, optional createdBy (User), classCode lifecycle fields |
| ClassUser | class_users | belongs to Class + User, has role (TUTOR/STUDENT), unique(classId, userId) |
| LearnerProfile | learner_profiles | 1:1 with User (students only) |
| Subscription | subscriptions | 1:1 with User, Stripe fields nullable |
| UserMetrics | user_metrics | 1:1 with User, aggregated dashboard data |
| ConversationSession | conversation_sessions | belongs to User, has many Messages, optional SessionEvaluation |
| Message | messages | belongs to User + Session, has type (TEXT/VOICE), optional MessageEvaluation |
| MessageEvaluation | message_evaluations | 1:1 with Message (USER messages only), stores grammar/vocab/fluency scores and corrections |
| SessionEvaluation | session_evaluations | 1:1 with ConversationSession, aggregate scores + strengths/weaknesses/recommendations |
| Vocabulary | vocabularies | belongs to User, SRS fields, unique(userId, word) |
| Goal | goals | belongs to User, optional tutor assigner |
| Progress | progress | daily snapshot, unique(userId, date) |

### Key Design Decisions
- All IDs are UUID v4
- All tables have createdAt/updatedAt
- User model has username (unique), email (unique), displayName, password (nullable — null for Google-only accounts), authProvider (LOCAL|GOOGLE), googleId (unique, nullable), avatarUrl, isActive, role, phoneNumber
- AI chatbot access is gated by Subscription: `status === ACTIVE`. Default after registration: `plan=FREE, status=INACTIVE` (no AI access). Class joining does NOT require a subscription.
- Classes have a unique classCode; tutor/student membership tracked via ClassUser join table
- ClassUser join table links any user (TUTOR or STUDENT) to a class with a `role` field and unique(classId, userId) constraint
- Class join flow is **direct** (no pending approval): a user submits a class code via `POST /classes/join` and is added as a STUDENT immediately, provided the code is not blocked, not expired, and the class is ACTIVE
- **Class code lifecycle:** each Class has `classCode`, `classCodeExpiresAt` (nullable — null = permanent), `classCodeRefreshIntervalSeconds` (nullable — null = no auto refresh), `classCodeBlocked` (boolean), and `classCodeRefreshedAt`. Tutors of the class (or admins) can rotate, change the refresh interval, or block/unblock the code via dedicated endpoints. Codes are 8-char uppercase alphanumeric (excludes ambiguous chars like 0/O/1/I/L) generated in `classes/classCode.util.ts`
- **Lazy auto-refresh on expiry:** the service rotates an expired code on demand, so no cron job is needed. Three triggers, all routed through the shared `refreshIfExpired(classId)` helper in `classes.service.ts`:
  1. **Join attempt with an expired code** — code is rotated internally and the join is rejected with HTTP 410 (Gone). The user must obtain the new code from the tutor.
  2. **`GET /classes/:id` by an admin or by a tutor of the class** — code is rotated before the response is built, so opening the class detail is enough to see a fresh code.
  3. **`GET /classes/mine`** — for each class where the caller is a TUTOR with a currently expired code, the code is rotated before the list is built. Student memberships do NOT trigger rotation, so students cannot bump the rotation by spamming reads.
- No separate settings table — settings live in LearnerProfile
- Vocabulary uses SM-2 SRS algorithm fields (srsInterval, srsEase, srsDue)
- Progress is exactly 1 row per user per calendar day
- Cascade delete on all user-owned relations
- RefreshToken table stores hashed (SHA-256) refresh tokens for server-side revocation; one row per active session/device
- **Message evaluation flow:** each user message is evaluated by the AI for grammar (0-100), vocabulary (0-100 + CEFR level), fluency (0-100), overall score (weighted: 35% grammar + 35% vocab + 30% fluency), corrections (original/corrected/explanation), and feedback. Evaluations are stored in `message_evaluations` (1:1 with Message). Students see inline corrections after each message.
- **Session evaluation:** generated on `POST /sessions/:id/end`. Aggregates all message evaluations into averages, detects session-level CEFR, identifies strengths/weaknesses/recommendations, and lists new vocabulary for SRS. Stored in `session_evaluations` (1:1 with ConversationSession).
- **Message type vs session mode:** `SessionMode` (TEXT/VOICE) is the starting mode. Individual `Message.type` (TEXT/VOICE) allows mixed-mode sessions — no separate MIXED enum needed.
- **Session limits:** soft limit (FREE=50, PREMIUM=150 user messages) shows a warning; hard limit (soft+10) blocks further messages. Daily session cap (FREE=3, PREMIUM=50) prevents runaway costs.
- **AI provider placeholder:** `messages.service.ts` contains `getAIResponse()` — a placeholder that returns heuristic-based evaluations. Replace with real AI API calls when provider is finalized. See `docs/services/ai-providers.md` for provider comparison.

---

## API Conventions
- All routes prefixed: `/api/v1/`
- Standard response: `{ success: boolean, message: string, data: any, meta?: { page, limit, total, totalPages } }`
- Custom errors: `throw new AppError("message", statusCode)`
- All async controllers wrapped in `asyncHandler()`
- Pagination: `?page=1&limit=20` (max 100)
- All request inputs validated with Zod (body, params, query)
- Swagger JSDoc comments on all routes; shared `ErrorResponse` schema defined in `swagger.ts` components
- Auth middleware pattern: `authenticate` → attaches `req.user`; `authorize("ROLE")` → guards by role
  - 401: no token / invalid token / `req.user` missing when `authorize` runs
  - 403: valid token but insufficient role (`"Access denied. Required role: X or Y"`)
  - Usage: `router.get("/path", authenticate, authorize("ADMIN"), handler)`

---

## Code Standards
- TypeScript strict mode, avoid `any`
- Services: business logic only, never touch req/res
- Controllers: handle req/res only, call services
- Prisma transactions for multi-table writes
- Winston: info for requests, error for failures
- All relations use onDelete: Cascade (user-owned) or SetNull (optional refs)

## Testing
- **Runner:** Bun's built-in test runner (`bun test`) — no extra runner package needed
- **HTTP testing:** `supertest` — makes real HTTP requests against the Express app without starting a server
- **Test type:** Integration tests — tests the full middleware chain as the frontend experiences it
- **Token generation:** JWTs are signed directly in tests using env secrets (no DB user lookup needed for auth tests — JWTs are stateless)
- **DB dependency:** 401/403 tests are DB-independent; 200 success tests require DB running (seeded or empty — both return 200)
- **File location:** Co-located in `src/modules/[name]/__tests__/[name].router.test.ts`
- **Error handler:** `ZodError` is handled as 400 with a field-level message; `AppError` maps to its own `statusCode`; all other errors return 500

---

## Environment Variables

Secrets are managed via **Infisical**. See `SECRETS.md` for the full setup guide.

- Infisical project: `esl-chatbot`
- Environments: `dev` (local), `prod` (production)
- `.env.example` lists all required variables as a reference — do not copy secrets from there into a `.env` file unless absolutely necessary
- `.infisical.json` in the project root binds the directory to the `esl-chatbot` project (created by `infisical init`)

**Database setup (0 to hero):** See `docs/services/database.md` for the full Neon setup guide — creating a project, choosing a region, getting the connection string, running migrations, seeding, and troubleshooting.

**Note:** If your PostgreSQL password contains special characters (e.g. `&`, `(`, `)`),
URL-encode them in `DATABASE_URL`. Example: `(Gochan&DB)` → `(Gochan%26DB)`.

---

## Startup Behavior
On `bun dev` / `bun start`, the server:
1. Validates all env vars via Zod (exits if invalid)
2. Connects to PostgreSQL and logs connection status
3. Lists all tables with row counts
4. Starts Express on the configured PORT
5. Logs server URL, API docs URL, and health endpoint

---

## Seed Data
Run `bun run db:seed` to populate the database with test data:
- **Admin:** admin_main / admin@tutelage.com
- **Tutor:** tutor_sarah / sarah@tutelage.com (class code: `SARAH123`, weekly auto-refresh, expires in 7 days)
- **Student 1:** student_ali / ali@tutelage.com (PREMIUM, B1 level)
- **Student 2:** student_yuki / yuki@tutelage.com (FREE, A2 level)
- **Password for all:** `password123`

Includes: classes (with full code-lifecycle fields populated) with enrolled users (tutor + students via ClassUser), learner profiles, subscriptions, metrics, conversation sessions with messages, vocabulary with SRS data, goals, and daily progress snapshots.

---

## Recommended Next Phases

### Phase 2 — Auth Module (Critical Path)
- ✅ `POST /auth/login` — username + password → access token (15m) + refresh token (7d) + user data (id, username, email, displayName, role, avatarUrl, isActive, subscription.plan/status)
- ✅ `POST /auth/register` — creates User + LearnerProfile + Subscription (FREE/INACTIVE) + UserMetrics in a single transaction; returns tokens immediately (no separate login needed)
- ✅ `POST /auth/google` — Google Sign-In: verifies Google ID token, handles login / account merge / new registration in one endpoint; see `docs/services/google-oauth.md`
- ✅ `GET /auth/google/test` — dev-only HTML page: renders a Google Sign-In button and displays the resulting ID token so it can be copy-pasted into Swagger (disabled in production)
- ✅ `POST /auth/refresh` — exchange valid refresh token for a new access token
- ✅ `POST /auth/logout` — revoke refresh token (deleted from DB)
- ✅ `authenticate.ts` middleware — verifies Bearer access token, attaches `req.user = { id, username, email, role }`
- ✅ Refresh tokens stored server-side as SHA-256 hashes in `refresh_tokens` table (supports multi-device, true revocation)
- ✅ `authorize.ts` middleware factory (role guard) — `authorize(...roles: Role[])` factory; throws 401 if `req.user` missing, 403 with `"Access denied. Required role: X"` if role not in allowed list
- Remaining: password reset flow, email verification placeholder

### Phase 3 — User & Class Modules
- ✅ `GET /users` — paginated user list, filterable by `?role=` (admin only)
- ✅ `GET /users/:id` — full user profile: learnerProfile, subscription, metrics, classUsers (admin only)
- ✅ `GET /classes` — paginated class list with memberCount + code-lifecycle fields, filterable by `?status=` (admin only)
- ✅ `GET /classes/:id` — class detail with enrolled members (id, role, user: id/username/displayName/avatarUrl). Access: admins or members of the class only (anyone else gets 404). **Refresh-on-read:** triggers a lazy rotation when the caller is an admin or a tutor of this class and the code is currently expired
- ✅ `POST /classes` — tutor or admin creates a class; creator becomes a TUTOR member; a fresh code is generated; optional `classCodeRefreshIntervalSeconds`
- ✅ `POST /classes/join` — any authenticated user joins by code; no pending state. Rejects with 403 (blocked), 410 (expired — code is auto-rotated internally), 409 (already a member or class INACTIVE), 404 (unknown code)
- ✅ `GET /classes/mine` — list classes the authenticated user is a member of, with their role per class. **Refresh-on-read:** any class where the caller is a TUTOR with an expired code is rotated before the list is built (student memberships do not trigger rotation)
- ✅ `POST /classes/:id/code/refresh` — tutor of the class (or admin) manually rotates the code; expiry resets per the configured interval
- ✅ `PATCH /classes/:id/code/settings` — change `classCodeRefreshIntervalSeconds` (null = permanent); recomputes expiry from `classCodeRefreshedAt`
- ✅ `PATCH /classes/:id/code/block` — block or unblock the code with `{ blocked: boolean }`. Blocking does not change the code value or expiry
- User CRUD (self-update profile, admin manage users)
- LearnerProfile CRUD for students
- Admin: assign tutors, manage all users

### Phase 4 — Conversation Sessions & Messages
- ✅ `POST /sessions` — start a new conversation session (requires active subscription, daily caps: FREE=3, PREMIUM=50)
- ✅ `GET /sessions` — list user's sessions (paginated, filterable by mode/active status)
- ✅ `GET /sessions/:id` — session detail with all messages and evaluations
- ✅ `POST /sessions/:id/end` — end session, compute averages, generate SessionEvaluation
- ✅ `POST /sessions/:sessionId/messages` — send message → AI responds → MessageEvaluation generated (grammar, vocabulary, fluency, corrections). Per-session limits: FREE=50+10 buffer, PREMIUM=150+10 buffer
- ✅ `GET /sessions/:sessionId/messages` — paginated message list with evaluations
- ✅ MessageEvaluation table: per-message grammar/vocabulary/fluency scores, corrections, CEFR detection
- ✅ SessionEvaluation table: aggregate scores, strengths, weaknesses, recommendations, detected CEFR level
- ✅ Message type field (TEXT/VOICE) — sessions can contain both types (mixed mode)
- ✅ AI integration placeholder with heuristic-based evaluation (swap for real AI provider later)
- Remaining: real AI provider integration, TTS/STT pipeline, Socket.io real-time messaging

### Phase 5 — Vocabulary & SRS System
- CRUD for vocabulary items
- SM-2 spaced repetition algorithm implementation
- Review queue: fetch due cards, submit review result, update SRS fields
- Bulk import/export vocabulary
- Category management

### Phase 6 — Goals & Progress
- Goal CRUD (student self-set + tutor-assigned)
- Progress daily snapshot creation (cron job or on-demand)
- Milestone tracking within goals
- Goal status transitions (ACTIVE → COMPLETED/PAUSED/CANCELLED)
- Dashboard aggregation queries

### Phase 7 — Metrics & Dashboard
- UserMetrics auto-update on session end, message send, vocabulary review
- Streak calculation logic (current + longest)
- Skill level estimation based on AI evaluations
- Tutor dashboard: view all students' metrics
- Admin dashboard: platform-wide analytics

### Phase 8 — Subscriptions & Billing
- Plan enforcement middleware (FREE vs PREMIUM limits)
- TTS usage tracking and monthly reset
- Stripe integration: customer creation, checkout, webhook handling
- Plan upgrade/downgrade flows

### Phase 9 — Infrastructure & Polish
- Redis caching for hot queries (user profiles, session data)
- Rate limiting per-plan (stricter for FREE)
- Email notifications (SendGrid): welcome, password reset, weekly digest
- File upload handling (audio recordings, avatars)
- Socket.io real-time chat implementation
- Cron jobs: daily progress snapshots, SRS reset, streak calculation
- Comprehensive error logging and monitoring
- API documentation completion (Swagger)
- Integration and unit tests
