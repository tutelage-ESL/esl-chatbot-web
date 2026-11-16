# Test Accounts

All accounts use password: **`password123`**

---

## Users

| Username | Email | Role | Plan | Sub Status | Email Verified | Notes |
|---|---|---|---|---|---|---|
| `admin_main` | admin@tutelage.com | ADMIN | FREE | ACTIVE | ✅ | Full platform access |
| `tutor_sarah` | sarah@tutelage.com | TUTOR | FREE | ACTIVE | ✅ | Teaches "Sarah's ESL Class" |
| `student_ali` | ali@tutelage.com | STUDENT | PREMIUM | ACTIVE | ✅ | B1→B2, 10-day streak, paid via CASH |
| `student_yuki` | yuki@tutelage.com | STUDENT | FREE | ACTIVE | ✅ | A2→B1, 4-day streak |

---

## Class

| Name | Code | Expires | Members |
|---|---|---|---|
| Sarah's ESL Class | `SARAH123` | 7 days from last seed | tutor_sarah (TUTOR), student_ali (STUDENT), student_yuki (STUDENT) |

---

## What each account has seeded

**student_ali (PREMIUM)**
- 7 sessions (5 TEXT, 2 VOICE) with full message + session evaluations
- 10 vocabulary words with varied SRS states
- 1 completed goal + 3 active goals
- 14 days of progress snapshots
- 3 notifications

**student_yuki (FREE)**
- 3 sessions (all TEXT) with full evaluations
- 8 vocabulary words
- 1 active goal
- 7 days of progress snapshots
- 1 notification

**tutor_sarah**
- Member of Sarah's ESL Class as TUTOR
- 3 class announcements posted

**admin_main**
- No sessions/vocab/goals — zero-row metrics, admin access to everything

---

## Reset & Re-seed Command

To wipe all data and start fresh (dev DB only — irreversible):

```bash
cd backend

# Step 1 — drop everything + re-run all migrations
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" infisical run --env=dev -- bunx prisma migrate reset --force

# Step 2 — re-seed (if migrate reset didn't auto-seed)
infisical run --env=dev -- bun prisma/seed.ts
```

Or without Infisical (needs a local `.env`):

```bash
cd backend
bunx prisma migrate reset --force
bun prisma/seed.ts
```
