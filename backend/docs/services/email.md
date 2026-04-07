# Email — Resend

## Decision
**Resend** for transactional email. SendGrid is already scaffolded in the codebase
(`src/config/sendgrid.ts`) and can be kept as an alternative — both work fine.

---

## Use Cases

| Email | Trigger | Phase |
|-------|---------|-------|
| Welcome email | User registers | Phase 2 |
| Password reset link | User requests reset | Phase 2 |
| Enrollment notification | Tutor/admin gets new request | Phase 3 |
| Enrollment approved/rejected | Student gets notified | Phase 3 |
| Weekly progress digest | Cron job (weekly) | Phase 9 |

---

## Why Resend (over SendGrid)

| Feature | Resend | SendGrid |
|---------|--------|---------|
| Free tier | 3,000/mo, 100/day | 100/day |
| API design | Modern, TypeScript-first | Older REST API |
| React email templates | Built-in support | Manual HTML |
| Dashboard | Clean, minimal | Feature-heavy |
| Deliverability | Excellent | Excellent |

Resend was built specifically for developers and has a much cleaner API.
That said, **SendGrid is already scaffolded** — if you'd rather not switch, just fill
in the SendGrid API key and implement the placeholder functions.

---

## Resend Setup

```bash
bun add resend
```

```typescript
// src/config/resend.ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### Required Env Vars
```env
RESEND_API_KEY=re_xxxx
EMAIL_FROM=no-reply@yourdomain.com
```

> You need to verify your sending domain in the Resend dashboard. During development,
> Resend provides a test domain so you can send without domain setup.

---

## Production Considerations

- **Domain verification** is required before sending to real users
- For high volume (10,000+/mo), **AWS SES** is cheapest at $0.10/1,000 emails
- Always use a subdomain for sending: `mail@tutelage.com` or `noreply@tutelage.com`

### Alternatives at Scale
| Service | Cost | Notes |
|---------|------|-------|
| Resend (Pro) | $20/mo for 50K | Good value, keep same SDK |
| AWS SES | $0.10/1,000 | Cheapest at scale, more setup |
| Postmark | $15/mo for 10K | Best deliverability for transactional |
