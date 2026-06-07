# Redis — Upstash (Cache)

Redis is used for caching hot read paths to reduce database load. The backend uses
**ioredis** with **Upstash** as the managed Redis provider.

---

## What Is Cached

| Cache Key | TTL | Source | What It Avoids |
|-----------|-----|--------|----------------|
| `user:auth:{userId}` | 5 min | `auth.service.ts → getMe()` | 1 DB query per page load (User + Subscription join) |
| `user:dashboard:{userId}` | 2 min | `dashboard.service.ts → getDashboardOverview()` | ~14 parallel DB queries per dashboard open |

Cache key format is defined in `src/config/cache.ts → cacheKeys`. Never construct keys manually.

---

## Cache Invalidation Map

Every mutation that changes cached data must call `deleteCache(...)` after the DB write.

### Invalidates `user:auth:{userId}`

| File | Function | Why |
|------|----------|-----|
| `auth.service.ts` | `googleAuth()` Case B | email-merge sets `emailVerified=true` + subscription INACTIVE→ACTIVE |
| `auth.service.ts` | `verifyEmail()` | `emailVerified` + subscription `status` INACTIVE→ACTIVE |
| `auth.service.ts` | `linkGoogle()` | `emailVerified` + subscription `status` INACTIVE→ACTIVE |
| `auth.service.ts` | `logout()` | clears entry so replayed access tokens within JWT TTL don't serve stale data |
| `users.service.ts` | `updateMyProfile()` | `displayName`, `avatarUrl` |
| `users.service.ts` | `updateUserAvatar()` | `avatarUrl` |
| `admin.service.ts` | `updateUser()` | `role`, `isActive` (security-critical) |
| `admin.service.ts` | `assignSubscription()` | `plan`, `status` |
| `admin.service.ts` | `cancelSubscription()` | `plan`, `status` |
| `admin.service.ts` | `adminUpdateProfile()` | `displayName`, `avatarUrl` |
| `admin.service.ts` | `adminUploadAvatar()` | `avatarUrl` |
| `subscriptions.service.ts` | `applyFibStatusChange()` | `plan`, `status` via FIB webhook/polling |
| `subscriptions.service.ts` | `cancelFibSubscription()` | ACTIVE/TRIAL cancellation downgrades to FREE ACTIVE |

### Invalidates `user:dashboard:{userId}`

| File | Function | Why |
|------|----------|-----|
| `sessions.service.ts` | `endSession()` | Streak, study time, skills, recent sessions |
| `vocabulary.service.ts` | `addVocabulary()` | `totalWords`, vocab chart |
| `vocabulary.service.ts` | `deleteVocabulary()` | `totalWords`, vocab chart |
| `vocabulary.service.ts` | `reviewVocabulary()` | `dueVocabCount` |
| `goals.service.ts` | `createGoal()` | `nextUp` section |
| `goals.service.ts` | `updateGoal()` | `nextUp` section |
| `goals.service.ts` | `deleteGoal()` | `nextUp` section |
| `users.service.ts` | `updateMyLearnerProfile()` | `weeklyGoalMinutes` → daily goal mins |
| `admin.service.ts` | `adminUpdateLearnerProfile()` | `weeklyGoalMinutes` → daily goal mins (admin path) |

---

## Graceful Degradation

Redis is **never** required for the app to function. All cache operations in
`src/config/cache.ts` are wrapped in try/catch and silently return `null`/`undefined`
on any error. The caller falls through to the database.

- **Dev without Redis running**: server boots, logs a warning, cache is disabled
- **Redis goes down in production**: app continues, DB handles all reads, Sentry captures reconnect errors
- **Test environment**: cache is skipped entirely (no Redis connection attempt)

---

## Architecture

```
src/config/cache.ts     ← client init, key factories, TTL constants, get/set/delete helpers
src/config/redis.ts     ← re-exports connectRedis/disconnectRedis (kept for back-compat)
src/index.ts            ← connectRedis() after DB connect; disconnectRedis() before shutdown
```

All service files import directly from `../../config/cache.ts`.

---

## One-Time Setup

### Step 1 — Create Upstash database
1. Go to **https://upstash.com** → sign up → **Create Database**
2. Settings:

| Setting | Value |
|---------|-------|
| Name | `tutelage-cache` |
| Region | Match your Neon DB region (eu-central-1 for Frankfurt) |
| Type | Regional |
| TLS | **Enabled** (required) |
| Eviction Policy | `allkeys-lru` ← set this, or the cache will refuse writes when full |

### Step 2 — Copy the Redis URL
From the Upstash dashboard → your database → **Details** → copy **Redis URL**.
It looks like: `rediss://default:password@your-instance.upstash.io:6379`

The `rediss://` prefix (with double `s`) enables TLS. Never use plain `redis://` in production.

### Step 3 — Add to Infisical
1. Open **https://app.infisical.com** → `esl-chatbot` project
2. Add `REDIS_URL` to both **dev** and **prod** environments with the URL from Step 2
3. In `dev`, you can also use `redis://localhost:6379` if you run a local Redis — but Upstash works in dev too

### Step 4 — Verify
After restarting the server, check logs for:
```
[redis] Connected to rediss://default:***@your-instance.upstash.io:6379
```

---

## Rate Limiter Upgrade Path

The in-memory rate limiters in `src/middlewares/rateLimits.ts` are sufficient for a single
server process. When horizontal scaling is needed, switch to `rate-limit-redis` with the same
Upstash connection — it is a one-line store change per limiter.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Full Redis connection URL. Use `rediss://` for Upstash (TLS required) |
