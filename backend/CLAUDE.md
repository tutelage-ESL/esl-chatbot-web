# CLAUDE.md — ESL Chatbot Backend

## Overview
AI-powered English learning platform backend. Supports student-tutor-admin hierarchy,
conversation sessions, vocabulary SRS, progress tracking, and subscription management.

---

## Tech Stack
- **Runtime:** Bun
- **Language:** TypeScript (strict mode)
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
```bash
bun dev              # Start dev server with --watch
bun start            # Start production server
bun run db:generate  # Generate Prisma client
bun run db:migrate   # Run Prisma migrations
bun run db:push      # Push schema to DB (no migration)
bun run db:seed      # Seed the database
bun run db:studio    # Open Prisma Studio
bun run typecheck    # TypeScript type check
```

---

## Architecture: Modular Domain-Based (Layered)

```
src/
├── config/          # env, database, redis, sendgrid, swagger, logger
├── modules/         # domain modules (11 total)
│   ├── auth/        # login, register, token refresh, password reset
│   ├── users/       # CRUD, profile management
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
| User | users | 1:1 profile/subscription/metrics, has many classes (tutor), has many classEnrollments (student) |
| Class | classes | has many ClassStudents, no direct tutor FK |
| ClassStudent | class_students | belongs to Class + User (student), unique(classId, studentId) |
| EnrollmentRequest | enrollment_requests | student↔tutor, unique(studentId, tutorId) |
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
- User model has username (unique), displayName, password, avatarUrl, isActive, role, phoneNumber
- Classes have a unique classCode; no direct tutor FK (tutor identity tracked via ClassStudent)
- ClassStudent join table links students to classes with unique constraint
- No separate settings table — settings live in LearnerProfile
- Vocabulary uses SM-2 SRS algorithm fields (srsInterval, srsEase, srsDue)
- Progress is exactly 1 row per user per calendar day
- Cascade delete on all user-owned relations

---

## API Conventions
- All routes prefixed: `/api/v1/`
- Standard response: `{ success: boolean, message: string, data: any, meta?: { page, limit, total, totalPages } }`
- Custom errors: `throw new AppError("message", statusCode)`
- All async controllers wrapped in `asyncHandler()`
- Pagination: `?page=1&limit=20` (max 100)
- All request inputs validated with Zod (body, params, query)
- Swagger JSDoc comments on all routes

---

## Code Standards
- TypeScript strict mode, avoid `any`
- Services: business logic only, never touch req/res
- Controllers: handle req/res only, call services
- Prisma transactions for multi-table writes
- Winston: info for requests, error for failures
- All relations use onDelete: Cascade (user-owned) or SetNull (optional refs)

---

## Environment Variables
See `.env.example` for all required/optional variables.

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
- **Admin:** admin_main
- **Tutor:** tutor_sarah (class code: SARAH-2024)
- **Student 1:** student_ali (PREMIUM, B1 level)
- **Student 2:** student_yuki (FREE, A2 level)
- **Password for all:** `password123`

Includes: classes with enrolled students, learner profiles, subscriptions, metrics, enrollment requests,
conversation sessions with messages, vocabulary with SRS data, goals, and daily progress snapshots.

---

## Recommended Next Phases

### Phase 2 — Auth Module (Critical Path)
Build the authentication system first since every other module depends on it.
- Implement `auth.service.ts`: register, login, refresh token, logout
- Password hashing with bcryptjs (salt rounds: 12)
- JWT access token (15m) + refresh token (7d) issuance
- Implement `authenticate.ts` middleware (verify JWT, attach req.user)
- Implement `authorize.ts` middleware factory (role guard)
- Registration flow: create User + LearnerProfile + Subscription + UserMetrics in transaction
- Email verification placeholder (SendGrid integration)
- Password reset flow (token-based)
- Routes: POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout

### Phase 3 — User & Enrollment Modules
- User CRUD (self-update profile, admin manage users)
- Tutor class code generation on tutor creation
- Enrollment request flow: student submits code → tutor approves/rejects → tutorId linked
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
