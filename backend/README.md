# ESL Chatbot Backend

AI-powered English learning platform backend built with Bun, Express, TypeScript, and Prisma.

## Features

- **Student-Tutor-Admin hierarchy** with class enrollment system
- **AI conversation sessions** with grammar/fluency evaluation
- **Vocabulary flashcards** with SM-2 spaced repetition algorithm
- **Learning goals** (self-set or tutor-assigned) with milestone tracking
- **Daily progress snapshots** and skill-level metrics
- **Subscription management** (FREE / PREMIUM) with Stripe integration (planned)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Language | TypeScript (strict mode) |
| Framework | Express.js 5 |
| Database | PostgreSQL + [Prisma](https://prisma.io) 6 |
| Auth | JWT (access + refresh tokens) + bcryptjs |
| Validation | Zod 4 |
| Logging | Winston + Morgan |
| API Docs | Swagger (OpenAPI 3.0) |
| Security | Helmet, CORS, rate limiting |

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [PostgreSQL](https://www.postgresql.org/) >= 14
- [Node.js](https://nodejs.org/) >= 20 (for Prisma CLI)

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and secrets:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/esl-chatbot-web?schema=public
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-secret-here
```

> **Tip:** If your password has special characters like `&`, URL-encode them (e.g. `&` → `%26`).

### 3. Create the database

Create a PostgreSQL database named `esl-chatbot-web` (or whatever you set in `DATABASE_URL`).

### 4. Push schema & generate client

```bash
bun run db:push       # Creates all tables
bun run db:generate   # Generates Prisma client
```

### 5. Seed test data

```bash
bun run db:seed
```

This creates test users, conversations, vocabulary, goals, and progress data. See [Test Accounts](#test-accounts) below.

### 6. Start the server

```bash
bun dev    # Development (hot reload)
bun start  # Production
```

The server will log database connection status, table info, and listen URL on startup.

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server with hot reload |
| `bun start` | Start production server |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:push` | Push schema to DB (skip migrations) |
| `bun run db:seed` | Seed database with test data |
| `bun run db:studio` | Open Prisma Studio GUI |
| `bun run typecheck` | Run TypeScript type check |

## Project Structure

```
src/
├── config/            # Environment, database, logger, Swagger config
├── modules/           # Domain modules (auth, users, enrollment, etc.)
│   └── [module]/
│       ├── [module].router.ts
│       ├── [module].controller.ts
│       ├── [module].service.ts
│       ├── [module].schema.ts      # Zod validation
│       └── [module].types.ts
├── middlewares/        # Auth, error handling, file upload
├── utils/             # AppError, asyncHandler, apiResponse, pagination
├── routes/v1/         # API v1 route mounting
├── types/             # TypeScript declarations
├── jobs/              # Cron jobs (placeholder)
├── socket/            # Socket.io handlers (placeholder)
├── app.ts             # Express app setup
└── index.ts           # Server entry point
```

## Database Schema

12 tables with full relational integrity:

- **users** — core identity (student/tutor/admin roles, username-based auth)
- **classes** — tutor-owned classes with unique class codes
- **class_students** — student enrollment in classes (join table)
- **learner_profiles** — student learning preferences and settings
- **subscriptions** — plan management (FREE/PREMIUM)
- **user_metrics** — aggregated dashboard stats per student
- **enrollment_requests** — student-tutor class join workflow
- **conversation_sessions** — chat session lifecycle
- **messages** — individual messages within sessions
- **vocabularies** — flashcards with SRS scheduling
- **goals** — learning objectives with progress tracking
- **progress** — daily study snapshots

## API

- Base URL: `http://localhost:8080/api/v1`
- Docs: `http://localhost:8080/api-docs`
- Health: `http://localhost:8080/health`

All responses follow:
```json
{
  "success": true,
  "message": "...",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

## Test Accounts

After running `bun run db:seed`:

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Admin | admin_main | password123 | Platform administrator |
| Tutor | tutor_sarah | password123 | Class code: `SARAH-2024` |
| Student | student_ali | password123 | PREMIUM plan, B1 level |
| Student | student_yuki | password123 | FREE plan, A2 level |

## License

Private — All rights reserved.
