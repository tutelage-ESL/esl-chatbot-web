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
- **Auth:** JWT (access + refresh tokens) + bcryptjs
- **Cache:** Redis (placeholder — integrate later)
- **Email:** SendGrid (placeholder — integrate later)
- **File Uploads:** Multer
- **Realtime:** Socket.io (placeholder — integrate later)
- **Security:** Helmet, express-rate-limit, cors
- **Logging:** Winston + Morgan
- **API Docs:** Swagger (OpenAPI 3.0 via swagger-jsdoc)
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
bun test               # Run all tests (requires DB running + seeded) (via Infisical)
bun run test:watch     # Run tests in watch mode (via Infisical)
```

---

## Architecture: Modular Domain-Based (Layered)

```
src/
├── config/          # env, database, redis, sendgrid, swagger, logger
├── modules/         # domain modules (12 total)
│   ├── auth/        # login, register, token refresh, password reset
│   ├── users/       # CRUD, profile management
│   ├── classes/     # class list and detail (admin only)
│   ├── enrollment/  # student-tutor class join flow
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
| ClassStatus | ACTIVE, INACTIVE |
| EnrollStatus | PENDING, ACCEPTED, REJECTED |
| SessionMode | TEXT, VOICE |
| MessageRole | USER, ASSISTANT |
| GoalStatus | ACTIVE, COMPLETED, PAUSED, CANCELLED |
| Plan | FREE, PREMIUM |
| SubStatus | ACTIVE, INACTIVE, CANCELLED, PAST_DUE |

### Models
| Model | Table | Key Relations |
|-------|-------|---------------|
| User | users | 1:1 profile/subscription/metrics, has many classUsers, has many enrollmentRequests, has many resolvedEnrollments |
| Class | classes | has many ClassUsers, has many EnrollmentRequests (via classCode FK) |
| ClassUser | class_users | belongs to Class + User, has role (TUTOR/STUDENT), unique(classId, userId) |
| EnrollmentRequest | enrollment_requests | belongs to User (requester) + Class (via classCode) + optional User (resolver), unique(userId, classCode) |
| LearnerProfile | learner_profiles | 1:1 with User (students only) |
| Subscription | subscriptions | 1:1 with User, Stripe fields nullable |
| UserMetrics | user_metrics | 1:1 with User, aggregated dashboard data |
| ConversationSession | conversation_sessions | belongs to User, has many Messages |
| Message | messages | belongs to User + Session |
| Vocabulary | vocabularies | belongs to User, SRS fields, unique(userId, word) |
| Goal | goals | belongs to User, optional tutor assigner |
| Progress | progress | daily snapshot, unique(userId, date) |

### Key Design Decisions
- All IDs are UUID v4
- All tables have createdAt/updatedAt
- User model has username (unique), email (unique), displayName, password, avatarUrl, isActive, role, phoneNumber
- Classes have a unique classCode; tutor/student membership tracked via ClassUser join table
- ClassUser join table links any user (TUTOR or STUDENT) to a class with a `role` field and unique(classId, userId) constraint
- EnrollmentRequest links to Class via classCode FK (classCode is @unique on Class, enabling referential integrity without a UUID FK); unique(userId, classCode) prevents duplicate requests per class
- EnrollmentRequest has an optional `resolverId` (FK to User) — the admin or tutor who accepted/rejected the request
- No separate settings table — settings live in LearnerProfile
- Vocabulary uses SM-2 SRS algorithm fields (srsInterval, srsEase, srsDue)
- Progress is exactly 1 row per user per calendar day
- Cascade delete on all user-owned relations
- RefreshToken table stores hashed (SHA-256) refresh tokens for server-side revocation; one row per active session/device

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
- **Tutor:** tutor_sarah / sarah@tutelage.com (class code: SARAH-2024)
- **Student 1:** student_ali / ali@tutelage.com (PREMIUM, B1 level)
- **Student 2:** student_yuki / yuki@tutelage.com (FREE, A2 level)
- **Password for all:** `password123`

Includes: classes with enrolled users (tutor + students via ClassUser), learner profiles, subscriptions, metrics, enrollment requests,
conversation sessions with messages, vocabulary with SRS data, goals, and daily progress snapshots.

---

## Recommended Next Phases

### Phase 2 — Auth Module (Critical Path)
- ✅ `POST /auth/login` — username + password → access token (15m) + refresh token (7d) + user data (id, username, email, displayName, role, avatarUrl, isActive, subscription.plan/status)
- ✅ `POST /auth/refresh` — exchange valid refresh token for a new access token
- ✅ `POST /auth/logout` — revoke refresh token (deleted from DB)
- ✅ `authenticate.ts` middleware — verifies Bearer access token, attaches `req.user = { id, username, email, role }`
- ✅ Refresh tokens stored server-side as SHA-256 hashes in `refresh_tokens` table (supports multi-device, true revocation)
- ✅ `authorize.ts` middleware factory (role guard) — `authorize(...roles: Role[])` factory; throws 401 if `req.user` missing, 403 with `"Access denied. Required role: X"` if role not in allowed list
- Remaining: POST /auth/register (User + LearnerProfile + Subscription + UserMetrics in transaction), password reset flow, email verification placeholder

### Phase 3 — User & Enrollment Modules
- ✅ `GET /users` — paginated user list, filterable by `?role=` (admin only)
- ✅ `GET /users/:id` — full user profile: learnerProfile, subscription, metrics, classUsers (admin only)
- ✅ `GET /classes` — paginated class list with memberCount, filterable by `?status=` (admin only)
- ✅ `GET /classes/:id` — class detail with enrolled members (id, role, user: id/username/displayName/avatarUrl) (admin only)
- User CRUD (self-update profile, admin manage users)
- Tutor class code generation on tutor creation
- Enrollment request flow: user submits classCode → admin or tutor in the class approves/rejects → resolverId set on resolution
- LearnerProfile CRUD for students
- Admin: assign tutors, manage all users

### Phase 4 — Conversation Sessions & Messages
- Session lifecycle: create, end, list, get by ID
- Message creation within session (with word count tracking)
- AI integration placeholder (evaluations stored in aiEvaluation JSON)
- Session summary generation placeholder
- Real-time messaging via Socket.io

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
