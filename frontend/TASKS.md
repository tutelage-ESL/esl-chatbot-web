# Frontend Tasks

This file is the source of truth for pending frontend work.
Backend is maintained by **Aland**. Frontend is maintained by **Rekar**.

When a task is done, move it to the **Done** section with the commit hash.
When Aland adds a new backend API, he notes it here so Rekar knows what to wire up.

---

## Pending

### 1. Overview page — wire to real API
**File:** `app/pages/dashboard/index.vue`  
**Status:** All data is hardcoded mock — nothing is wired to the backend yet.

Wire up the following:
- `GET /metrics/me` → stat cards (streak, total study time, skill scores, estimated CEFR level)
- `GET /progress/summary?days=7` → weekly chart + activity heatmap
- `GET /sessions?limit=5` → recent sessions list
- `GET /vocabulary/due` → "due today" words widget

Create a `useOverview` composable (or split into `useMetrics` + `useProgress`) in `app/composables/`.

---

### 2. Goals page — wire to real API
**File:** `app/pages/dashboard/goals.vue`  
**Status:** All data is hardcoded mock. No `useGoals` composable exists.

Build `app/composables/useGoals.ts` and wire the page:
- `GET /goals` → list goals (filterable by `?status=` and `?type=`)
- `POST /goals` → create goal modal/form
- `PATCH /goals/:id` → update progress, status, description
- `DELETE /goals/:id` → delete

GoalType enum values: `VOCABULARY | SPEAKING | GRAMMAR | CONVERSATION | STUDY_TIME`  
GoalDifficulty enum values: `EASY | MEDIUM | HARD | EXPERT`  
Status transitions: `ACTIVE → COMPLETED / PAUSED / CANCELLED` — setting COMPLETED auto-sets `completedDate` + `progress=100` on the backend.

---

### 3. Vocabulary page — wire to real API + SRS review flow
**File:** `app/pages/dashboard/vocab.vue`  
**Status:** All data is hardcoded mock. No `useVocabulary` composable exists.

Build `app/composables/useVocabulary.ts` and wire the page:
- `GET /vocabulary` → word list (filterable by `?due=true`, `?source=`, `?search=`)
- `GET /vocabulary/due` → SRS review queue (up to 50 cards due today)
- `POST /vocabulary` → add word manually
- `POST /vocabulary/:id/review` → submit SM-2 rating — body: `{ quality: 0 | 1 | 2 | 3 | 4 | 5 }`
- `PATCH /vocabulary/:id` → edit definition/example/category
- `DELETE /vocabulary/:id` → delete word

The flashcard "Again / Hard / Good / Easy" buttons should map to quality `0 / 1 / 3 / 5`.  
`masteryLevel` (0–5) is returned by the API — use it for the progress indicator on each card.

**New (backend done):** When a session ends (`POST /sessions/:id/end`), the response's `evaluation.newVocabulary` now contains real word objects: `{ word, definition, partOfSpeech?, example? }`. The chat page's session-end view could show a "Words learned this session" summary panel using this data. Words are also automatically added to the user's vocabulary table (source: SESSION) and will appear in `/vocabulary` and `/vocabulary/due`.

---

### 4. Profile page — wire to real API + edit form
**File:** `app/pages/dashboard/profile.vue`  
**Status:** Only `username` comes from the auth store. Level badge, study time, session count, native languages, plan badge — all hardcoded.

Wire up:
- `GET /users/me` → full profile (displayName, phoneNumber, avatarUrl, authProvider, learnerProfile, subscription)
- `PATCH /users/me` → edit display name and phone number
- `POST /users/me/avatar` **(new — file upload)** → replace avatar image. Send `multipart/form-data` with a single field named `avatar` (image file, max 5 MB, jpeg/png/webp/gif). Returns `{ avatarUrl: string }`. Use this instead of passing `avatarUrl` as a string in `PATCH /users/me` — the file upload endpoint handles storage and cleanup automatically.
- `PATCH /users/me/learner-profile` → learner settings form:
  - `currentLevel` / `targetLevel` — CEFR enum: `A1 | A2 | B1 | B2 | C1 | C2`
  - `aiPersonality` — `FRIENDLY | FORMAL | CASUAL | ENCOURAGING | STRICT | PATIENT`
  - `topicsOfInterest` — string array
  - `voiceSpeed` — float 0.5–2.0
  - `theme` — `light | dark`
  - `weeklyGoalMinutes` — integer 5–840

The "Edit profile" button on the page should open a form/modal for these fields.

---

### 5. Notifications — missing entirely
**Status:** No bell icon, no panel, no composable.

Build `app/composables/useNotifications.ts` and add a notification bell to `DashboardHeader.vue`:
- `GET /users/me/notifications?read=false` → unread count (badge on bell icon) + notification feed
- `PATCH /users/me/notifications/read-all` → mark all as read on panel open

Notification types: `STREAK_MILESTONE | GOAL_COMPLETED | GOAL_ASSIGNED | CLASS_ANNOUNCEMENT`

Display as a dropdown panel in the header — unread items highlighted, timestamp shown.

---

### 6. Admin dashboard — missing entirely
**Status:** No page exists for ADMIN role users.

Create `app/pages/dashboard/admin.vue` (guard with `v-can` or `requiresRole: 'ADMIN'` in `definePageMeta`).

Wire up:
- `GET /admin/dashboard` → platform stats: total users by role, active subscriptions by plan (FREE/GOLD/PREMIUM counts), daily/weekly active users, total sessions today, revenue by payment method
- `GET /users?role=&search=&subscriptionStatus=` → paginated user table with search/filter
- `PATCH /admin/users/:id` → toggle `isActive` (ban/unban) and change `role`
- `PUT /admin/users/:id/subscription` → assign plan manually (`{ plan, durationMonths }`)
- `DELETE /admin/users/:id/subscription` → cancel subscription

Add an "Admin" link in the sidebar visible only when `user.role === 'ADMIN'`.

---

### 7. Voice Lab — connect to real Socket.io pipeline
**File:** `app/pages/dashboard/voice.vue`  
**Status:** Hardcoded phoneme scores and prompt. Real backend pipeline exists but is not wired.

The backend has a full Socket.io voice pipeline on the `/chat` namespace:
- `voice:start` → begins a voice session
- `voice:chunk` → stream base64 audio chunks during recording
- `voice:end` → finalizes: STT → LLM → TTS response + pronunciation assessment
- Server emits `message:new` with the AI response + pronunciation scores

This page should use the Socket.io composable (or create `useVoice.ts`) to stream mic audio and display real pronunciation scores per word returned from the backend.

---

## Done

- ✅ Auth (login, register, Google Sign-In, password reset, OTP)
- ✅ Chat page — real API wired via `useSessions` + Socket.io real-time messaging
- ✅ Classes — full CRUD, drawer with tabs (members, students, analytics, announcements), `useClasses` composable
- ✅ Billing — FIB payment flow, polling, `useSubscription` composable, subscription panel
- ✅ HTTP layer — `useHttp` with 401 refresh/retry cycle, centralized token persistence

---

## Backend Notes for Frontend

### Email verification flow — NEW endpoints (2026-05-31)
Email verification now **activates the FREE plan** (unlocks the AI tutor). Previously only linking Google did this — now verifying the registration email does too. `AuthUser` (returned by login / register / `GET /auth/me` / Google / verify-email) gained an **`emailVerified: boolean`** field.

Flow to wire up:
1. **After register**, the user is logged in but `emailVerified=false` / `subscription.status=INACTIVE`. The backend has emailed them a 6-digit code. Show a "verify your email to unlock the AI tutor" screen/banner.
2. **`POST /auth/verify-email`** — body `{ email, otp }` (6 digits). Returns the updated `AuthUser` (now `emailVerified=true`, `subscription.status=ACTIVE`). Update the auth store with this response. Unauthenticated endpoint — works even if the session expired. Idempotent (re-submitting an already-verified email returns 200).
   - `400` = invalid/expired/used code; `422` = bad format; `429` = rate limited (10 / 15 min).
3. **`POST /auth/resend-verification`** — body `{ email }`. Always returns 200 ("if registered and unverified, a code was sent" — anti-enumeration). Add a "resend code" button with a cooldown (limit is 5 / hour).
4. **Persistent banner**: anywhere AI is gated, if `emailVerified=false`, show "Verify your email or link Google to start chatting." Google link (`POST /auth/link-google`) is the alternative activation path and also sets `emailVerified=true`.

Codes expire in 24h. Types are already in `frontend/types/api.ts` (`paths['/auth/verify-email']`, `paths['/auth/resend-verification']`).

### Dashboard overview types — use the generated `api.ts` (2026-05-30)
Heads up Rekar: `GET /dashboard/overview` was missing from `frontend/types/api.ts` because `bun run generate:types` wasn't run after the backend route was added. I've regenerated it — the route + full response shape now live in the canonical `types/api.ts` (the `paths["/dashboard/overview"]` entry).

The hand-written `app/common/types/dashboard-overview-types.ts` duplicates those types manually, which the project convention specifically warns against (types must flow from Swagger → `api.ts`, never maintained by hand). When you get a chance, retire that file and point `useDashboardOverview.ts` at the generated types instead, e.g.:

```ts
import type { components } from '~/types/api'
type DashboardOverviewData = NonNullable<
  components['schemas'] // or pull from paths['/dashboard/overview']['get']['responses'][200]...['data']
>
```

Not urgent (the duplicate currently mirrors the backend correctly), but it will silently drift the next time the backend shape changes. **Reminder for future endpoints:** after any backend route lands, run `bun run generate:types` from `backend/` and commit `frontend/types/api.ts` — no hand-written mirror files.

### Rate limiting (2026-05-29)
Rate limiting is now live in production on all auth and AI endpoints. The backend returns **HTTP 429** with `{ success: false, message: "Too many requests. Please wait and try again.", data: null }`.

Response headers include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` (seconds until window resets) — these can be used to show a countdown.

**Action needed:** Auth forms (login, register, forgot-password) should display a user-friendly message when the API returns 429, e.g. _"Too many attempts. Please wait a few minutes and try again."_ The existing `useHttp` error handling should catch 429 like any other error — just make sure the UI surfaces the message rather than showing a generic error.
