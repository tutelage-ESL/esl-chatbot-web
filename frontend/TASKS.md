# Frontend Tasks

This file is the source of truth for pending frontend work.
Backend is maintained by **Aland**. Frontend is maintained by **Rekar**.

When a task is done, move it to the **Done** section with the commit hash.
When Aland adds a new backend API, he notes it here so Rekar knows what to wire up.

---

### 7. Voice Lab — connect to real Socket.io pipeline ✅ DONE
**File:** `app/pages/dashboard/voice.vue`
**Status:** Wired to the real `/chat` voice pipeline via a new `useVoiceLab.ts` composable
(built on the existing `useVoiceChat.ts`).

What was built — a hands-free live **CALL**, not a chat:
- The page is a full-screen voice-call experience (per Rekar: "it should be like a call, no
  text mid-conversation — a live call"). You tap Start, then talk hands-free: the mic stays
  open, **client-side silence detection (VAD)** auto-ends your turn after a ~1.4s pause, the AI
  reply auto-plays, and the mic auto-resumes listening. Tap End to hang up.
- The backend voice pipeline is half-duplex (processes a turn only on `voice:end`), so the
  continuous-call feel is built entirely on the client in `useVoiceLab.ts` (a call state machine:
  connecting → listening → thinking → speaking → listening). **No backend changes.**
- New components under `components/Pages/Dashboard/Voice/`: `CallIntro` (pre-call screen),
  `CallStage` (orb + live caption + timer + mute/end/log controls), `CallOrb` (reactive avatar
  that breathes with the AI and reacts to your mic level), `TranscriptLog` (a `UiSheet` record of
  the conversation, reusing `TurnRow`), rebuilt `ScorePanel`, new `PronunciationCard`.
- The transcript is kept as a quiet record (toggle the log button), never the main surface.
- **Pronunciation gating:** Azure pronunciation assessment is GOLD/PREMIUM-only, so FREE users
  get the full voice conversation + grammar/vocab/fluency scores, and the pronunciation card
  shows a locked upsell (with a `UiPopover` hover hint) instead of fake numbers. The *feature*
  is gated, not the page.
- New types in `common/types/voice-types.ts`; removed the dead `PhonemeScore` type and the
  obsolete `PromptCard.vue` / `PhonemeGrid.vue`.
- Fixed a latent bug in `useVoiceChat.ts` (`recorder.onerror` called `onError()` with no args).

---

### 8. Notification items — make clickable with redirect
**File:** `app/components/Layouts/Dashboard/NotificationPanel.vue`  
**Status:** Items are static — clicking does nothing.

Each notification type should navigate to the relevant page when clicked:
- `STREAK_MILESTONE` → `/dashboard` (overview)
- `GOAL_COMPLETED` → `/dashboard/goals`
- `GOAL_ASSIGNED` → `/dashboard/goals`
- `CLASS_ANNOUNCEMENT` → `/dashboard/classes`

On click: close the dropdown, navigate to the route. Mark the individual item as read if it isn't already — use `PATCH /users/me/notifications/:id/read` (now available). Returns the updated notification with `read: true`. 404 if the notification doesn't exist or belongs to another user.

---

## Backend Notes for Frontend

### Internal (stealth) admin accounts — FYI only, nothing to wire (2026-06-12)
The backend now supports hidden internal admin accounts (`isInternal` flag, never serialized in any API response — `types/api.ts` is unchanged). They are automatically excluded from `GET /users`, admin dashboard counts, class member lists / rosters / analytics, `memberCount`, and notifications. **No frontend changes needed** — just be aware that an internal account logged into the dashboard sees everything normally, while other users (including admins) never see it anywhere.

### Email verification is now MANDATORY before login (2026-06-06) — ⚠️ flow changed
Security fix: registering no longer logs the user in. The account is created but **unverified and unusable** until the email is verified — `POST /auth/login` returns **403** for unverified accounts. This closes the hole where you could register with someone else's email and log straight in. `AuthUser` (login / register / `GET /auth/me` / Google / verify-email) carries **`emailVerified: boolean`**.

Current wired-up flow (done — see `signup.vue`, `verify-email.vue`, `signin.vue`, `stores/auth.ts`):
1. **`POST /auth/register`** — body `{ username, email, password, displayName }`. Returns the created `AuthUser` (201) — **NO tokens**. The store's `signUp()` persists nothing. `signup.vue` stashes only the email in `sessionStorage.pendingEmail` and routes to `/verify-email`.
2. **`POST /auth/verify-email`** — body `{ email, otp }`. Returns a **`LoginResponse` (`{ user, accessToken, refreshToken }`)** — verifying logs the user in. The store's `verifyEmail()` persists those tokens, then the page goes to `/dashboard`.
   - `400` = invalid/expired/used code; **`409` = already verified (sign in normally)** — no longer idempotent; `422` = bad format; `429` = rate limited (10 / 15 min).
3. **`POST /auth/resend-verification`** — body `{ email }`. Always 200 (anti-enumeration). `verify-email.vue` has a 60s resend cooldown.
4. **Login 403 handling**: `signin.vue` detects the "verify your email" 403 and redirects to `/verify-email`. Because login uses *username* (not email), the verify page asks the user to type their email when none was carried over.
5. **Google** (`POST /auth/google` / `/auth/link-google`) is still the instant alternative — Google emails are pre-verified, so it sets `emailVerified=true` + `status=ACTIVE` and returns tokens directly.

Codes expire in 24h. Types are in `frontend/types/api.ts` (`paths['/auth/verify-email']`, `paths['/auth/resend-verification']`).

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

### Teacher Task System — NEW (2026-06-11)
Backend is complete. Two new Prisma models (`Task`, `TaskSubmission`) + two new notification types (`TASK_ASSIGNED`, `TASK_SUBMITTED`). Run `bun run generate:types` from `backend/` then commit `frontend/types/api.ts` before wiring the UI.

**API surface:**
- `GET  /classes/:id/tasks` — list tasks for a class (members only). Tutors/admins get `submissionCount`; students also receive `mySubmission` (null if not yet submitted).
- `POST /classes/:id/tasks` — tutor/admin creates a task (`{ title, description, deadline? }`). Fires `TASK_ASSIGNED` notification to all students.
- `GET  /tasks/:id` — task detail (same shape, student gets `mySubmission`).
- `PATCH /tasks/:id` — tutor/admin updates (`{ title?, description?, deadline?, closed? }`). `closed: true` locks submissions; `closed: false` reopens.
- `DELETE /tasks/:id` — tutor/admin deletes.
- `POST /tasks/:id/submissions` — student submits (`{ content?, fileUrl? }` — at least one required). 409 if already submitted or task is closed.
- `GET  /tasks/:id/submissions` — tutor/admin lists all submissions with student info.
- `PATCH /tasks/:id/submissions/:submissionId/feedback` — tutor/admin writes `{ feedback }`.

**Notification routing to add to `NotificationPanel.vue`:**
- `TASK_ASSIGNED` → `/dashboard/classes` (student: navigate to the class tasks tab)
- `TASK_SUBMITTED` → `/dashboard/classes` (tutor: navigate to the class tasks tab)

**Suggested UI placement:**
- Add a **Tasks tab** to the class detail page (`/dashboard/classes/[id]`), alongside the existing Members, Students, Analytics, and Announcements tabs.
  - Tutor/admin tab view: task list with Create button (dialog or inline form), submission counts, close/delete actions per task; clicking a task opens a sheet with all submissions + feedback form per submission.
  - Student tab view: task list with status (Not submitted / Submitted / Feedback received); clicking a task opens a sheet to submit text/file and view feedback.
- Task status badges: `OPEN` → active style, `CLOSED` → inactive/muted style.
- Deadline should be displayed as a relative date ("Due in 3 days", "Overdue") using `@vueuse/core`'s `useTimeAgo` or a simple helper.

**New model file needed:** `app/common/model/task.ts` (plain types mirroring `Task` and `TaskSubmission` schema). New types file: `app/common/types/task-types.ts` (API shapes: `TaskItem`, `TaskSubmissionItem`).

### Rate limiting (2026-05-29)
Rate limiting is now live in production on all auth and AI endpoints. The backend returns **HTTP 429** with `{ success: false, message: "Too many requests. Please wait and try again.", data: null }`.

Response headers include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` (seconds until window resets) — these can be used to show a countdown.

**Action needed:** Auth forms (login, register, forgot-password) should display a user-friendly message when the API returns 429, e.g. _"Too many attempts. Please wait a few minutes and try again."_ The existing `useHttp` error handling should catch 429 like any other error — just make sure the UI surfaces the message rather than showing a generic error.

** meeting **
# add Ku-lang to landing page + fix the color a bit
# get the agreement text from the business owner and let user sign it.