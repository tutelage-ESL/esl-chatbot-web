# Email — Resend

## Decision
**Resend** for all transactional email. SendGrid is scaffolded in `src/config/sendgrid.ts`
as a fallback — both work, but Resend is the primary choice.

---

## Use Cases

| Email | Trigger | Phase |
|-------|---------|-------|
| Welcome email | User registers | Phase 2 |
| Password reset OTP | User requests reset | Phase 2 |
| Google link reminder | User registers without Google | Phase 2 |
| Password set recommendation | Google-only user logs in | Phase 2 |
| Enrollment notification | Tutor/admin gets new member | Phase 3 |
| Subscription confirmed | User upgrades to PREMIUM | Phase 8 |
| Subscription expiring soon | 7 days before period end (cron) | Phase 8 |
| Subscription cancelled/past_due | Webhook from Stripe | Phase 8 |
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

---

## Resend Setup

```bash
bun add resend
```

```typescript
// src/config/resend.ts
import { Resend } from "resend";
import { env } from "./env.ts";

export const resend = new Resend(env.RESEND_API_KEY);
```

### Required Env Vars
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

---

## Your Setup Steps (Technical)

### Step 1 — Create a Resend account
1. Go to **[resend.com](https://resend.com)** → click **Sign Up**
2. Confirm your email, then log in to the dashboard

### Step 2 — Get your API key (`RESEND_API_KEY`)
1. In the Resend dashboard sidebar → click **API Keys**
2. Click **Create API Key**
3. Name it (e.g. `tutelage-dev`)
4. Permission: **Sending access** is enough
5. Copy the key → it starts with `re_...`
6. **Add it to Infisical** under the `dev` environment: key = `RESEND_API_KEY`

> ⚠️ You only see the key once — copy it immediately before closing the modal.

### Step 3 — Choose your sending domain (`EMAIL_FROM`)

#### Option A — Use Resend's free test domain (dev only, fastest)
- Resend provides `@resend.dev` — no setup needed
- Set `EMAIL_FROM=onboarding@resend.dev` in Infisical
- Works immediately, only delivers to the **email you signed up with** (good for local dev)

#### Option B — Verify your own domain (recommended for staging/prod)
1. In the Resend dashboard → **Domains** → **Add Domain**
2. Enter your domain (e.g. `tutelage.com`) → click **Add**
3. Resend will show you **3 DNS records** to add (2× TXT, 1× MX):

   | Type | Name | Value |
   |------|------|-------|
   | TXT | `resend._domainkey.yourdomain.com` | (DKIM key Resend gives you) |
   | TXT | `@` or `yourdomain.com` | `v=spf1 include:resend.com ~all` |
   | MX | `send.yourdomain.com` | `feedback-smtp.us-east-1.amazonses.com` |

4. Add these records in your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.)
5. Click **Verify** in Resend — it can take a few minutes to propagate
6. Once verified (green checkmark), set `EMAIL_FROM=noreply@yourdomain.com` in Infisical

> For a subdomain sender (cleaner deliverability): use `noreply@mail.tutelage.com`
> and verify `mail.tutelage.com` as the domain in Resend.

### Step 4 — Add both vars to Infisical
```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM     = onboarding@resend.dev       ← dev (or your verified domain)
```

---

## Production Considerations

- **Domain verification** is required before sending to real users (not your own email)
- Use a subdomain for sending: `noreply@mail.tutelage.com` — protects your root domain reputation
- For high volume (10,000+/mo), **AWS SES** is cheapest at $0.10/1,000 emails
- Always handle Resend webhook events for bounces/complaints to protect sender reputation

### Alternatives at Scale
| Service | Cost | Notes |
|---------|------|-------|
| Resend (Pro) | $20/mo for 50K | Good value, keep same SDK |
| AWS SES | $0.10/1,000 | Cheapest at scale, more setup |
| Postmark | $15/mo for 10K | Best deliverability for transactional |
