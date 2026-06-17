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

### 8. Notification items — make clickable with redirect ✅ DONE (2026-06-12)

**Files changed:**
- `backend/prisma/schema.prisma` — added `data Json?` to Notification model (db:pushed)
- `backend/src/modules/notifications/notifications.service.ts` — `createNotification` accepts optional 4th `data` arg; `NOTIFICATION_SELECT` includes `data`
- `backend/src/modules/notifications/notifications.types.ts` — `NotificationItem.data: Prisma.JsonValue | null`
- `backend/src/modules/notifications/notifications.router.ts` — Swagger updated: all 7 types in enum, `data` field documented
- `backend/src/modules/tasks/tasks.service.ts` — TASK_ASSIGNED passes `{ classId, taskId }`, TASK_SUBMITTED passes `{ classId: task.classId, taskId }`
- `backend/src/modules/announcements/announcements.service.ts` — CLASS_ANNOUNCEMENT passes `{ classId }`
- `backend/src/modules/goals/goals.service.ts` — GOAL_ASSIGNED passes `{ goalId }`, GOAL_COMPLETED passes `{ goalId }`
- `backend/src/modules/vocabulary/vocabulary.service.ts` — **security fix:** added TUTOR class-membership guard (mirrors goals); **bug fix:** now fires VOCABULARY_ASSIGNED notification with `{ vocabularyId }` (was documented but never implemented)
- `app/common/model/notification.ts` — added `NotificationData` interface, `data?: NotificationData | null` on `Notification`
- `app/common/data/notification-routes.ts` — new `notificationRoute(n)` function mapping all 7 types to routes
- `app/composables/useNotifications.ts` — added `markOneRead(id)` (optimistic + fire-and-forget PATCH)
- `app/components/Layouts/Dashboard/NotificationPanel.vue` — rows are now clickable (cursor-pointer, hover surface, `select` emit)
- `app/components/Layouts/Dashboard/NotificationBell.vue` — `onSelect` closes dropdown, calls `markOneRead`, navigates via `notificationRoute`
- `app/pages/dashboard/classes/[id]/index.vue` — `?tab=` query param deep-link support; `route.params.id` watcher so class-to-class navigation reloads; post-load tab validation

**Routes:**
- `STREAK_MILESTONE` → `/dashboard`
- `GOAL_COMPLETED` / `GOAL_ASSIGNED` → `/dashboard/goals`
- `VOCABULARY_ASSIGNED` → `/dashboard/vocab`
- `TASK_ASSIGNED` / `TASK_SUBMITTED` → `/dashboard/classes/{classId}?tab=tasks`
- `CLASS_ANNOUNCEMENT` → `/dashboard/classes/{classId}?tab=announcements`
- Old notifications with `data=null` fall back to the generic list page gracefully.

---

### 9. Settings — Weekly digest email toggle ✅ DONE (2026-06-13)

**Files changed:**
- `app/common/types/profile-types.ts` — added `emailDigestEnabled: boolean` to `MyLearnerProfile` and `UpdateLearnerProfileInput`
- `app/pages/dashboard/profile.vue` — added Email digests card with toggle switch + helper text; shows status when disabled; toast on save
- `app/components/Pages/Dashboard/Profile/LearnerSettingsModal.vue` — added email digest toggle in settings modal; synced state on open/save
- `app/components/Block/UserAvatar.vue` — added quick Email digests toggle at top of dropdown menu (before Profile/Billing); fetches profile on mount; toast on toggle
- `app/composables/useNotifications.ts` — added toast notifications when new notifications arrive via Socket.io with type-specific emojis

**Implementation:**
- Two UI locations: Profile page card + Avatar dropdown menu toggle
- Both call `PATCH /users/me/learner-profile { emailDigestEnabled }` 
- Profile card: saves via settings modal with toast feedback
- Avatar dropdown: direct toggle with immediate toast + independent state sync
- Notification toasts: show when Socket.io receives `notification:new` event with emoji matching type (🔥🎉🎯📚📢✅📝)
- Status helper text shows when digest is disabled

---

## Backend Notes for Frontend

### Terms of Service / agreement signing — NEW, needs UI wiring (2026-06-17)
Backend is done. Three touch points (all types are in `frontend/types/api.ts`):

1. **Registration** — `POST /auth/register` now **requires** `acceptAgreement: true` in the body (returns 422 with `errors.acceptAgreement` if missing/false). Add an **"I accept the Terms of Service" checkbox** to `signup.vue` (and to `google-username.vue` for the Google new-account flow — `POST /auth/google` with a username now needs `acceptAgreement: true`, else 400). Add `acceptAgreement` to `signUpSchema` (must be `true`).
2. **Show the terms** — `GET /auth/agreement` (public, no auth) returns `{ version, effectiveDate, text }`. Render `text` (markdown-friendly) in a dialog/sheet opened from the checkbox label, and on the re-accept prompt below.
3. **Re-accept on login** — **both** `POST /auth/login` **and** `POST /auth/google` can now return **403 with `{ needsAgreement: true, agreementVersion }`** in the response body (alongside `message`) when the Terms changed since the user last accepted. Detect this in `signin.vue` / `stores/auth.ts` (similar to the existing unverified-email 403 redirect) and show a **re-accept modal** with the agreement text. On accept, call **`POST /auth/accept-agreement`** — for a password login send `{ username, password }` (the same credentials just typed); for a Google login send `{ idToken }` (the same Google credential). Either way it returns the normal `LoginResponse` (`{ user, accessToken, refreshToken }`), so persist tokens and proceed to `/dashboard` exactly like a successful login.

Note: the agreement **text is currently a placeholder** — the real legal copy lands later by the backend bumping the version; no frontend change needed when that happens (you always fetch the current text + version live).

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

### Teacher Task System ✅ DONE (2026-06-12)
UI fully implemented. Tasks tab added to `/dashboard/classes/[id]` alongside Members/Students/Analytics/Announcements.

**What was built:**
- `app/common/model/task.ts` — `Task` + `TaskSubmission` plain models
- `app/common/types/task-types.ts` — `TaskItem`, `TaskSubmissionItem`, `TaskAuthor` API shapes
- `app/common/schemas/TaskSchema.ts` — Zod schemas for task form, submission form, feedback
- `app/composables/useTasks.ts` — raw API layer (8 functions)
- `app/components/Pages/Dashboard/Classes/Tasks/TaskCard.vue` — task row with status/deadline/submission-state chips + 3-dot menu for tutor/admin
- `app/components/Pages/Dashboard/Classes/Tasks/ClassTasksTab.vue` — tab root with pagination, load-more, create/edit/delete/toggle-closed, delete confirmation dialog
- `app/components/Pages/Dashboard/Classes/Tasks/TaskFormDialog.vue` — create + edit dialog (3 fields)
- `app/components/Pages/Dashboard/Classes/Tasks/TaskDetailSheet.vue` — right-side sheet: tutor sees all submissions; student sees submit form / own feedback
- `app/components/Pages/Dashboard/Classes/Tasks/SubmissionRow.vue` — per-submission row with write/edit feedback form
- `app/common/model/notification.ts` + `NotificationPanel.vue` — extended with `TASK_ASSIGNED`, `TASK_SUBMITTED`, `VOCABULARY_ASSIGNED` icon/color mappings

### Rate limiting (2026-05-29)
Rate limiting is now live in production on all auth and AI endpoints. The backend returns **HTTP 429** with `{ success: false, message: "Too many requests. Please wait and try again.", data: null }`.

Response headers include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` (seconds until window resets) — these can be used to show a countdown.

**Action needed:** Auth forms (login, register, forgot-password) should display a user-friendly message when the API returns 429, e.g. _"Too many attempts. Please wait a few minutes and try again."_ The existing `useHttp` error handling should catch 429 like any other error — just make sure the UI surfaces the message rather than showing a generic error.

** meeting **
# add Ku-lang to landing page + fix the color a bit  ✅ DONE (commit 440cfcb — Kurdish/Sorani + RTL on public pages)
# get the agreement text from the business owner and let user sign it.
#   → Backend signing flow DONE (2026-06-17) — see "Terms of Service / agreement signing" note above for the UI to wire.
#   → Still pending from the business owner: the actual legal Terms text (backend drops it in + bumps version, no FE change).