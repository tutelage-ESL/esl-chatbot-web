# FIB Pre-Production Checklist — Tutelage Institute (Answer Sheet)

This document answers the FIB Pre-Production Subscription Checklist.
Transfer answers into the Word file and export as PDF before replying to FIB.

> **Action items before sending:**
> - Fill every field marked `TODO (business)` below
> - Attach the logo as a PNG file (500×500 px, high resolution)
> - Export the Word file as PDF and attach to the reply email

---

## Section A — Business Account and Purpose Validation

| # | Requirement | Answer |
|---|-------------|--------|
| 1 | Business Name | **TODO (business)** — e.g. "Tutelage Institute" |
| 2 | Business Activity | **TODO (business)** — e.g. "Online English language education platform" |
| 3 | Intended use case for FIB Subscription solution | Recurring subscription billing for paid learning plans. Users pay monthly, quarterly, semi-annually, or annually via FIB for GOLD or PREMIUM access to an AI-powered English learning platform (Tutelage AI). All transactions are in IQD. |

---

## Section B — Security Verification

| # | Requirement | Answer |
|---|-------------|--------|
| 1 | Do you use statusCallbackUrl? | **YES** |
| 2 | Confirm functional public endpoint with SSL certificate (HTTPS) | **YES** — endpoint is served over HTTPS with a valid TLS certificate *(pending production deployment — URL confirmed below)* |
| 3 | Provide your StatusCallbackUrl endpoint | `https://TODO-BACKEND-DOMAIN/api/v1/subscriptions/webhook/fib` *(replace `TODO-BACKEND-DOMAIN` with actual deployed domain before submitting)* |

**Implementation notes (for FIB's technical review):**
- The endpoint returns **202 Accepted** on receipt as required.
- Processing is async — the webhook body is acknowledged immediately and processed in the background.
- The body's `status` field is never trusted directly; we always call `GET /protected/v1/subscriptions/{id}` to re-verify the status from FIB before updating our database. This guards against spoofed callbacks.

---

## Section C — UI/UX Check Verification

| # | Requirement | Answer |
|---|-------------|--------|
| 1 | Is the Subscription section visual and highlighted? | **YES** — a dedicated `/dashboard/billing` page shows plan comparison and a "Subscribe" CTA with plan/interval selector. FREE-plan users also see an "Upgrade now" card permanently in the sidebar. The marketing homepage has a `#pricing` section with plan cards. |
| 2 | Is the Subscription reachable to users? | **YES** — accessible from (a) the dashboard sidebar navigation ("Billing" with a wallet icon), (b) the "Upgrade now" sidebar card visible to all FREE users, and (c) the public marketing pricing page which routes to `/dashboard/billing`. |

---

## Section D — Subscription Status Suggested Workflow

| # | Requirement | Answer |
|---|-------------|--------|
| 1 | Do you accept and use FIB's suggested workflow? | **YES, we use the webhook as the primary status check and the check-status endpoint as a fallback.** See detail in row 2. |
| 2 | Workflow description | **Primary:** `statusCallbackUrl` is provided at subscription creation. FIB POSTs status changes to our webhook endpoint. We respond with `202 Accepted`, then asynchronously call `GET /protected/v1/subscriptions/{id}` to re-verify and update our database. **Fallback:** `GET /protected/v1/subscriptions/{id}` (via our `GET /subscriptions/fib/:id/status` endpoint) is polled by the frontend every 5 seconds during the QR display flow (up to 5 minutes), and by a background reconciliation job that runs every 15 minutes to catch any subscription whose webhook was missed (e.g. transient server unavailability). **Status flow:** DRAFT → user pays in FIB app → ACTIVE (or TRIAL) callback received → user subscription upgraded. CANCELLED/REJECTED → user downgraded to FREE. |
| 3 | Do you use our API or SDK/Plugin? | **API** (direct HTTP calls via our own TypeScript client — not using the FIB SDK or any plugin) |
| 4 | If using SDK/Plugin, specify type | **N/A** — we use the API directly |
| 5 | Do you use the Check Subscription Status endpoint? | **YES** — `GET /protected/v1/subscriptions/{subscriptionId}` used in both the frontend polling flow and the webhook re-verification step |
| 6 | Do you use the Cancel endpoint? | **YES** — `POST /protected/v1/subscriptions/{subscriptionId}/cancel` called when users cancel from the billing page. DRAFT subscriptions (not yet paid) are cancelled locally without calling FIB (DRAFT→cancel is an illegal FIB transition). |

---

## Section E — Account Information for Subscription Service

| # | Requirement | Answer |
|---|-------------|--------|
| 1 | Connect to main account or terminal? | **TODO (business)** — Main Account or Terminal Account |
| 2 | Account Type | **TODO (business)** — Business / Business Terminal / Corporate / Corporate Terminal |
| 3 | Account info: Phone Number, Name, IQD-IBAN | **TODO (business)** — Phone: ___ · Account Name: ___ · IQD-IBAN: ___ |
| 4 | If Terminal: Main Account Phone, Name, IQD-IBAN | **TODO (business)** — only if terminal account selected above |
| 5 | Currency | **IQD** |

---

## Section F — Website and Application Information

| # | Requirement | Answer |
|---|-------------|--------|
| 1 | Website URL(s) | `https://TODO-FRONTEND-DOMAIN` *(pending production deployment)* |
| 2 | Application URLs (iOS/Android) | Web application only — no native iOS or Android app at this time. Web URL: same as above. |
| 3 | Technical stack | **Backend:** Bun runtime + Express 5 + TypeScript + Prisma ORM + PostgreSQL. **Frontend:** Nuxt 4 + Vue 3 + Tailwind CSS. **Hosting:** TODO (business — e.g. Railway/Render/DigitalOcean for backend; Vercel/Netlify for frontend). **FIB client:** Custom TypeScript HTTP client using OAuth2 client\_credentials grant against `https://fib.prod.fib.iq`. |
| 4 | Technical team contacts | **TODO (business)** — Name: ___ · Email: ___ · Phone: ___ |

---

## Section G — Contact Information

| # | Requirement | Answer |
|---|-------------|--------|
| 1 | Phone number | **TODO (business)** |
| 2 | Email Address | **TODO (business)** |
| 3 | Alternative contact number | **TODO (business)** |
| 4 | Alternative contact email | **TODO (business)** |

---

## Section H — Branding Information

| # | Requirement | Answer |
|---|-------------|--------|
| 1 | Logo (PNG, 500×500 px, high resolution) | **TODO (business)** — attach as a separate PNG file in the reply email |

---

## Before Submitting — Final Checklist

- [ ] All `TODO (business)` fields filled in the Word file
- [ ] Backend deployed at a public HTTPS URL with valid TLS certificate
- [ ] `FIB_WEBHOOK_URL` set to the deployed endpoint in Infisical `prod`
- [ ] Webhook endpoint smoke-tested: POST to it returns 202, `subscriptionId` is processed correctly
- [ ] Logo PNG file (500×500 px) prepared for attachment
- [ ] Word file exported as PDF
- [ ] Business owner acknowledges **1% FIB commission** on all transactions

---

## Reminder — Pricing (for business owner reference)

| Plan    | Interval  | Amount (IQD) | FIB 1% fee |
|---------|-----------|-------------:|------------|
| GOLD    | 1 month   |       25,000 | 250 IQD    |
| GOLD    | 3 months  |       70,000 | 700 IQD    |
| GOLD    | 6 months  |      130,000 | 1,300 IQD  |
| GOLD    | 12 months |      250,000 | 2,500 IQD  |
| PREMIUM | 1 month   |       45,000 | 450 IQD    |
| PREMIUM | 3 months  |      125,000 | 1,250 IQD  |
| PREMIUM | 6 months  |      230,000 | 2,300 IQD  |
| PREMIUM | 12 months |      440,000 | 4,400 IQD  |
