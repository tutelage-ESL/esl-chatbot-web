# FIB (First Iraqi Bank) — Integration Documentation

> **This file covers two separate FIB APIs:**
>
> | API | SDK | Purpose |
> |-----|-----|---------|
> | **Subscription API** ← _we are building this_ | `fibsubscribe` | Recurring GOLD/PREMIUM billing — jump to [FIB Subscription API](#fib-subscription-api-fibsubscribe-sdk) |
> | Web Payments API (reference) | `@first-iraqi-bank/sdk` | One-time payments — documented below for future reference |
>
> **Source Docs:** [FIB Web Payments](https://fib.iq/integrations/web-payments/) | [FIB Node.js SDK](https://first-iraqi-bank.github.io/fib-nodejs-payment-sdk/guide/index.html)

---

## Overview

The FIB Web Payments API is a RESTful payment service that allows web applications to accept payments from FIB bank account holders. It accepts JSON-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes. All requests must be made over HTTPS. The only supported currency is **IQD (Iraqi Dinar)**.

FIB provides an official **Node.js SDK** (`@first-iraqi-bank/sdk`) that wraps the REST API with a simple, type-safe interface built on top of the Fetch API. This is the recommended approach for Express.js applications.

---

## Environments

**Sandbox (Testing):**

- Base URL: `https://fib-stage.fib.iq`
- Register at the sandbox environment to get your `client_id` and `client_secret`.

**Production:**

- Contact `integration@fib.iq` or submit the [FIB Integration Request Form](https://fibtask.atlassian.net/jira/software/c/form/366f78be-e7df-4e5c-acf9-56b94b5d7971?from=directory) to obtain production credentials.
- FIB will provide production `client_id`, `client_secret`, and the production base URL.

---

## Installation (Node.js SDK)

Install the official FIB SDK in your Express.js project:
```bash
npm install @first-iraqi-bank/sdk
```

**Other package managers:**
```bash
yarn add @first-iraqi-bank/sdk
pnpm add @first-iraqi-bank/sdk
bun add @first-iraqi-bank/sdk
```

**Requirements:**

- Node.js v20 or higher (Maintenance and LTS versions supported).
- Supports both ESM and CJS module formats. ESM is recommended.
- Built on top of the Fetch API (available since Node.js v18).

---

## SDK Setup

> **Note:** This section (and the Authentication section below) applies to the **Web Payments API** (`@first-iraqi-bank/sdk`) only. If you are building the Subscription integration, skip to [FIB Subscription API](#fib-subscription-api-fibsubscribe-sdk) — the `fibsubscribe` SDK handles OAuth2 token management internally.

Create a reusable SDK client instance. Store your credentials in environment variables.

**Environment variables (`.env`):**
```
FIB_CLIENT_ID=your_client_id_from_fib
FIB_CLIENT_SECRET=your_client_secret_from_fib
FIB_ENV=stage
```

`FIB_ENV` accepts: `dev`, `stage`, or `prod`.

**SDK client file (e.g., `src/lib/fib.js`):**
```javascript
import { PaymentSDK } from "@first-iraqi-bank/sdk/payment";

const clientId = process.env.FIB_CLIENT_ID;
const clientSecret = process.env.FIB_CLIENT_SECRET;
const environment = process.env.FIB_ENV; // 'dev', 'stage', or 'prod'

export const FIB = PaymentSDK.getClient(clientId, clientSecret, environment);
```

Now you can import `FIB` anywhere in your Express app to call payment methods.

---

## SDK Methods

The `FIB` client exposes the following methods:

| Method                                                                  | Description                                |
| ----------------------------------------------------------------------- | ------------------------------------------ |
| `authenticate(signal?)`                                                 | Authenticates and returns an access token.  |
| `createPayment(paymentInput, accessToken, signal?)`                     | Creates a new payment.                      |
| `getPaymentStatus(paymentId, accessToken, signal?)`                     | Gets the status of a payment.               |
| `cancelPayment(paymentId, accessToken, signal?)`                        | Cancels an unpaid payment.                  |
| `refundPayment(paymentId, accessToken, signal?)`                        | Refunds a paid payment.                     |

All methods return a `Response` object (Fetch API), giving you full flexibility to parse or handle errors.

The optional `signal` parameter accepts an `AbortSignal` for canceling requests.

---

## Authentication

All API requests require a Bearer Token. The SDK handles the token endpoint for you.
```javascript
import { FIB } from "./lib/fib.js";

const authRes = await FIB.authenticate();
const { access_token, expires_in } = await authRes.json();
```

**Token response fields:**

| Field         | Description                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| access_token  | JWT Bearer token. Pass in `Authorization: Bearer <token>` header on all subsequent API calls.   |
| expires_in    | Access token lifetime in seconds. **Typically ~60 seconds — very short-lived.**                  |
| refresh_token | Longer-lived refresh token (~1800 seconds / 30 minutes). Can be used to get a new access token. |

**Token caching strategy (important — do not skip):**

**Never fetch a new token per request.** Tokens are rate-limited and short-fetching wastes quota. Instead:

1. Cache `access_token` + its expiry timestamp in memory (or Redis).
2. Before each API call, check if `now >= expiry - 5s` (5-second safety buffer).
3. If expired, call `FIB.authenticate()` to get a fresh token and update the cache.
4. For long-running processes, use the `refresh_token` (valid ~30 min) to get a new `access_token` without re-sending `client_secret`.

**Raw REST endpoint (for reference):**
```
POST https://fib.stage.fib.iq/auth/realms/fib-online-shop/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
```

---

## Create Payment

### Using the SDK
```javascript
import { FIB } from "./lib/fib.js";

const paymentInput = {
  amount: 1000, // amount in IQD, must be > 250
  description: "Payment for Order #12345", // optional, max 50 chars
  redirectUri: new URL("https://example.com/payments"), // optional
  statusCallbackUrl: new URL("https://example.com/api/callbacks/payment/status"), // optional
  refundableFor: { days: 1 }, // optional, min 12 hours, max 7 days
  expiresIn: { hours: 1 }, // optional, min 5 minutes, max 48 hours
};

const authRes = await FIB.authenticate();
const { access_token } = await authRes.json();

const res = await FIB.createPayment(paymentInput, access_token);
const payment = await res.json();
```

### Payment Input Fields

| Field             | Type     | Required | Description                                                                                     |
| ----------------- | -------- | -------- | ----------------------------------------------------------------------------------------------- |
| amount            | number   | Yes      | Payment amount in IQD. Must be greater than 250.                                                |
| description       | string   | No       | Description shown in FIB app (max 50 characters).                                               |
| redirectUri       | URL      | No       | URL where FIB app redirects the user after payment is authorized.                               |
| statusCallbackUrl | URL      | No       | Your backend endpoint URL. FIB POSTs to this when payment status changes.                       |
| expiresIn         | Duration | No       | When the payment expires. Min: 5 minutes, Max: 48 hours. Example: `{ hours: 1 }`               |
| refundableFor     | Duration | No       | How long after payment it can be refunded. Min: 12 hours, Max: 7 days. Example: `{ days: 1 }`  |
| extraData         | array    | No       | Up to 10 objects with `key` and `value` properties for attaching metadata (e.g., order IDs).    |

### Payment Response
```json
{
  "paymentId": "9dfa724f-4784-4487-811b-63057b540503",
  "readableCode": "S3LE-NZ2S-ZNGF",
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "validUntil": "2022-01-31T12:15:44.020920Z",
  "personalAppLink": "https://fib.iq/personal-app-link?paymentId=some-id",
  "businessAppLink": "https://fib.iq/business-app-link?paymentId=some-id",
  "corporateAppLink": "https://fib.iq/corporate-app-link?paymentId=some-id"
}
```

| Field            | Description                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| paymentId        | Unique UUID for the payment. Use to check status, cancel, or refund.                           |
| qrCode           | Base64-encoded PNG image. Display to user so they can scan with FIB mobile app.                |
| readableCode     | 12-character alphanumeric code. User can type this manually in FIB app if they can't scan QR.  |
| personalAppLink  | Deep link to open payment in FIB Personal app on mobile.                                       |
| businessAppLink  | Deep link to open payment in FIB Business app on mobile.                                       |
| corporateAppLink | Deep link to open payment in FIB Corporate app on mobile.                                      |
| validUntil       | ISO-8601 date-time when the payment expires.                                                   |

**Tip:** Show all 3 payment options to users (QR code, readable code, and deep links) for maximum convenience. Also, save the payment details in your database since users might refresh or close the page.

### Callback URL Behavior

When `statusCallbackUrl` is provided, FIB sends a POST request to your endpoint when the payment status changes:
```json
{
  "id": "<payment_id>",
  "status": "<payment_status>"
}
```

Your Express.js callback endpoint must return one of:

- `202` — Accepted
- `406` — Not accepted
- `500` — General error

> **Security requirement:** FIB does not sign webhook payloads. **Never trust the callback body alone.** When your callback endpoint receives a `PAID` status, always re-verify by calling `GET /protected/v1/payments/{paymentId}/status` before activating a subscription. This protects against spoofed callbacks.

**Raw REST endpoint (for reference):**
```
POST https://fib.stage.fib.iq/protected/v1/payments
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## Check Payment Status

### Using the SDK
```javascript
import { FIB } from "./lib/fib.js";

const authRes = await FIB.authenticate();
const { access_token } = await authRes.json();

const res = await FIB.getPaymentStatus(paymentId, access_token);
const status = await res.json();
```

### Response Example
```json
{
  "paymentId": "4d6f7625-60f7-48e3-82e3-b4592a4eb993",
  "status": "UNPAID",
  "validUntil": "2022-01-31T12:26:12.544Z",
  "paidAt": null,
  "amount": {
    "amount": 500,
    "currency": "IQD"
  },
  "decliningReason": null,
  "declinedAt": null,
  "paidBy": null
}
```

### Response Fields

| Field           | Description                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| paymentId       | Unique UUID of the payment.                                                                          |
| status          | One of: `PAID`, `UNPAID`, `DECLINED`, `REFUNDED`, `REFUND_REQUESTED`                                 |
| validUntil      | ISO-8601 date-time when the payment expires.                                                         |
| paidAt          | ISO-8601 date-time when payment was completed. `null` if not yet paid.                               |
| amount          | Object with `amount` (number) and `currency` (string, always "IQD").                                 |
| decliningReason | Reason for decline. `null` if not declined. See declining reasons below.                             |
| declinedAt      | ISO-8601 date-time when payment was declined. `null` if not declined.                                |
| paidBy          | Object with `name` (string) and `iban` (string) of the paying customer. `null` if not yet paid.      |

### Declining Reasons

| Value                | Meaning                                        |
| -------------------- | ---------------------------------------------- |
| SERVER_FAILURE       | Payment failed due to an internal server error. |
| PAYMENT_EXPIRATION   | Payment expired (past validUntil time).         |
| PAYMENT_CANCELLATION | Payment was cancelled by the user or merchant.  |

**Raw REST endpoint (for reference):**
```
GET https://fib.stage.fib.iq/protected/v1/payments/{paymentId}/status
Authorization: Bearer <access_token>
```

---

## Cancel Payment

Cancel an **unpaid** payment. Cannot cancel already-paid payments.

### Using the SDK
```javascript
import { FIB } from "./lib/fib.js";

const authRes = await FIB.authenticate();
const { access_token } = await authRes.json();

const res = await FIB.cancelPayment(paymentId, access_token);
// Successful response: 204 No Content
```

**Raw REST endpoint (for reference):**
```
POST https://fib.stage.fib.iq/protected/v1/payments/{paymentId}/cancel
Authorization: Bearer <access_token>
```

**Response:** `204 No Content` (empty body on success).

---

## Refund Payment

Refund a **paid** payment. Only works if `refundableFor` was set during payment creation and the refund window has not passed.

### Using the SDK
```javascript
import { FIB } from "./lib/fib.js";

const authRes = await FIB.authenticate();
const { access_token } = await authRes.json();

const res = await FIB.refundPayment(paymentId, access_token);
```

---

## TypeScript Types

The SDK provides these types for type-safe development:

### PaymentInput
```typescript
type PaymentInput = {
  amount: number;
  description?: string;
  redirectUri?: URL;
  statusCallbackUrl?: URL;
  expiresIn?: Duration;
  refundableFor?: Duration;
};
```

### PaymentResponse
```typescript
type PaymentResponse = {
  paymentId: string;
  readableCode: string;
  qrCode: string;
  validUntil: string;
  personalAppLink: string;
  businessAppLink: string;
  corporateAppLink: string;
};
```

### PaymentStatusResponse
```typescript
type PaymentStatusResponse = {
  paymentId: string;
  amount: MonetaryValue;
  status: "UNPAID" | "DECLINED" | "PAID" | "REFUNDED" | "REFUND_REQUESTED";
  paidAt?: string;
  decliningReason?: "PAYMENT_CANCELLATION" | "PAYMENT_EXPIRATION";
  declinedAt?: string;
  paidBy?: { name: string; iban: string };
};
```

---

## Error Handling

There are two types of errors to handle:

### 1. API Error Response (non-2xx status)

The response comes back but with an error status. FIB returns an error message and a `traceId`.
```javascript
const res = await FIB.getPaymentStatus(paymentId, access_token);

if (res.status !== 200) {
  const { errors } = await res.json();
  console.error("FIB API error:", errors);
}
```

### 2. Network/Runtime Errors

The request fails entirely (e.g., network error, timeout).
```javascript
try {
  const res = await FIB.getPaymentStatus(paymentId, access_token);
  const { status } = await res.json();
  return status;
} catch (error) {
  console.error("Something went wrong:", error);
  return null;
}
```

---

## Typical Express.js Integration Flow

1. **Install SDK:** `npm install @first-iraqi-bank/sdk`
2. **Configure:** Set `FIB_CLIENT_ID`, `FIB_CLIENT_SECRET`, and `FIB_ENV` in your `.env` file.
3. **Initialize:** Create a shared SDK client using `PaymentSDK.getClient()`.
4. **Create Payment Route:** In your Express route, call `FIB.authenticate()` then `FIB.createPayment()`. Return the `paymentId`, `qrCode`, `readableCode`, and app links to your frontend.
5. **Display to User:** On the frontend, show the QR code, readable code, and/or deep links so the customer can pay via the FIB app.
6. **Callback Endpoint:** Create a POST endpoint in Express that FIB will call when payment status changes. Use this to update your order status in the database.
7. **Check Status Route:** Optionally create a route that calls `FIB.getPaymentStatus()` for polling from your frontend.
8. **Handle Outcomes:** When status is `PAID`, fulfill the order. When `DECLINED`, handle based on `decliningReason`. Optionally support `refundPayment()` for refunds.
9. **Cancel Route:** Optionally create a route that calls `FIB.cancelPayment()` to cancel unpaid payments.

---

## Key Implementation Notes

- **All requests require HTTPS.** HTTP requests will fail.
- **Token lifetime is very short (~60 seconds).** Cache the token in memory; refresh before expiry. Do not fetch a new token per request.
- **refresh_token is valid ~1800 seconds (30 minutes).** Use it to renew access_token without re-sending client_secret.
- **Only IQD currency is supported.**
- **Minimum payment amount is 250 IQD.**
- **Never expose `client_secret` to the browser.** All FIB API calls must be server-side only.
- **The `statusCallbackUrl` is optional but strongly recommended.** It avoids polling. Your callback endpoint must accept POST requests and return HTTP 202, 406, or 500.
- **Always re-verify a callback via `GET /status` before activating a subscription.** FIB does not sign webhook payloads — spoofed callbacks are possible.
- **The `description` field is optional**, max 50 characters.
- **`expiresIn` range:** minimum 5 minutes, maximum 48 hours.
- **`refundableFor` range:** minimum 12 hours, maximum 7 days. Only set this if you want to support refunds.
- **Save payment details in your database.** Users might refresh or close the page.
- **For production**, change `FIB_ENV` to `prod` and use your production credentials.

---

## FIB Subscription API (own client)

> **This is the active integration.** FIB issued Subscription API credentials, not Web Payment API credentials. The Subscription API handles **recurring billing** — the correct model for GOLD/PREMIUM monthly/quarterly plans.
>
> **Implementation:** We use our own hand-written `src/lib/fib-client.ts` (the `fibsubscribe` npm package was broken and abandoned). The client handles OAuth2 `client_credentials` token caching, all three API calls (create/get/cancel), and a `waitForActivation` polling helper.

### Client Setup

```ts
// src/config/fib.ts — instantiated once at startup
import { FibClient } from '../lib/fib-client.ts';
import { env } from './env.ts';

export const fib =
  env.FIB_CLIENT_ID && env.FIB_CLIENT_SECRET
    ? new FibClient({
        clientId: env.FIB_CLIENT_ID,
        clientSecret: env.FIB_CLIENT_SECRET,
        environment: env.FIB_ENV === 'prod' ? 'production' : 'stage',
      })
    : null;
```

| Environment | Base URL                  |
|-------------|---------------------------|
| stage       | https://fib-stage.fib.iq  |
| production  | https://fib.prod.fib.iq   |

Token caching is done manually in the client — access tokens are cached in memory with a 30-second expiry buffer. No external state needed.

### Create Subscription

```ts
const sub = await fib.createSubscription({
  title: 'Tutelage GOLD',              // display name in FIB app
  description: 'Monthly English plan', // optional, shown to subscriber
  amount: 5000,                        // in IQD
  currency: 'IQD',
  interval: 'P1M',                     // ISO-8601: P1M=monthly, P3M=quarterly, P1Y=yearly
  trialPeriod: undefined,              // omit unless offering free trial (ISO-8601 e.g. 'P7D')
  expiresIn: 'P1DT12H',               // QR code validity
  statusCallbackUrl: 'https://yoursite.com/api/v1/subscriptions/webhook/fib',
});

// sub.subscriptionId — store in DB (maps to Subscription.externalSubscriptionId)
// sub.qrCode        — base64 PNG, display to user
// sub.appLink       — deep link to open in FIB app
// sub.readableCode  — alphanumeric code user can type manually
// sub.validUntil    — QR expiry ISO-8601
```

**ISO-8601 interval cheatsheet:**

| Value | Meaning     |
|-------|-------------|
| P1M   | 1 month     |
| P3M   | 3 months    |
| P6M   | 6 months    |
| P1Y   | 12 months   |
| P7D   | 7 days      |

### Get Subscription Status

```ts
const details = await fib.getSubscription(subscriptionId);
// details.status       — current status (see table below)
// details.activeUntil  — unix milliseconds timestamp (NOT ISO-8601)
// details.lastPaymentAt — unix milliseconds timestamp or null
```

> **`activeUntil` is unix milliseconds.** Convert to Prisma `DateTime` with `new Date(details.activeUntil)`. Storing the raw integer directly into a `DateTime` field will silently corrupt the data.

### Cancel Subscription

Returns `null` on success (HTTP 202).

```ts
await fib.cancelSubscription(subscriptionId);
```

### Subscription Statuses

| Status      | Description                                                 |
|-------------|-------------------------------------------------------------|
| `DRAFT`     | Created, waiting for subscriber to confirm via QR/app       |
| `TRIAL`     | Subscriber confirmed, currently in free trial period        |
| `ACTIVE`    | Actively charged on each billing interval                   |
| `REJECTED`  | Subscriber declined                                         |
| `CANCELLED` | Cancelled by merchant or subscriber                         |

### Wait for Activation (Polling Helper)

```ts
const result = await fib.waitForActivation(subscriptionId, {
  intervalMs: 4000,   // poll every 4s
  timeoutMs: 300000,  // give up after 5 min
});
// result.status: 'ACTIVE' | 'TRIAL' | 'REJECTED' | 'CANCELLED'
```

Prefer the webhook (`statusCallbackUrl`) over polling in production. Use `waitForActivation` for CLI scripts or one-off checks only.

### Webhook

FIB POSTs to your `statusCallbackUrl` on every status change:

```json
{ "subscriptionId": "...", "status": "ACTIVE" }
```

```ts
app.post('/api/v1/subscriptions/webhook/fib', async (req, res) => {
  res.sendStatus(202); // FIB requires 202 Accepted (pre-production checklist Section D)

  const { subscriptionId } = req.body;

  // Always re-verify from FIB — never trust the webhook body alone.
  // FIB does not sign callbacks, so any POST with status: ACTIVE would otherwise
  // activate a subscription for free.
  const details = await fib.getSubscription(subscriptionId);

  if (details.status === 'ACTIVE' || details.status === 'TRIAL') {
    // activate subscription in DB
  } else if (details.status === 'CANCELLED' || details.status === 'REJECTED') {
    // downgrade to FREE ACTIVE
  }
});
```

> **Security:** Always call `fib.getSubscription(subscriptionId)` before acting on the webhook body. FIB does not sign callbacks. The `status` field in the webhook body is ignored — only the re-verified status from the API is trusted.

> **202 is required:** FIB's pre-production checklist (Section D) explicitly requires the callback endpoint to return `202 Accepted`. Returning `200` is technically accepted by FIB stage but may cause retries in production.

### Error Handling

```ts
import { FibSubscribe, FibSubscribeError } from 'fibsubscribe';

try {
  await fib.createSubscription({ ... });
} catch (err) {
  if (err instanceof FibSubscribeError) {
    console.error(err.message, err.statusCode, err.body);
  }
}
```

---

## ESL Platform Integration Notes

This section captures Tutelage-specific decisions for the FIB integration.

### Client Decision

We use our own `src/lib/fib-client.ts` (Subscription API) — **not** `fibsubscribe` (broken npm package) or `@first-iraqi-bank/sdk` (Web Payments API). FIB issued Subscription API credentials because our GOLD/PREMIUM tiers are recurring monthly/quarterly plans, which maps directly to FIB's native subscription billing.

### Sandbox Test Credentials

Add to Infisical under the `dev` environment:

```
FIB_CLIENT_ID=tutelage-test-sub
FIB_CLIENT_SECRET=<secret from FIB email>   # stored in Infisical only, never in code/docs
FIB_ENV=stage
```

**Sandbox test accounts (for testing the subscriber flow):**

| Account  | Phone       | Password     | OTP     | PIN  |
|----------|-------------|--------------|---------|------|
| Personal | 7701234567  | Personal@123 | 123-456 | 1234 |
| Business | 7301111588  | Business@123 | 123-456 | 1234 |

Face ID verification in sandbox: scan any face.

### Subscription Pricing (IQD)

Prices confirmed and locked in `subscriptions.service.ts → PLAN_AMOUNTS_IQD`. FIB applies a **1% commission** on all subscription transactions — confirm your pricing accounts for this.

| Plan    | Interval  | ISO-8601 | Amount (IQD) |
| ------- | --------- | -------- | -----------: |
| GOLD    | 1 month   | P1M      |       25,000 |
| GOLD    | 3 months  | P3M      |       70,000 |
| GOLD    | 6 months  | P6M      |      130,000 |
| GOLD    | 12 months | P1Y      |      250,000 |
| PREMIUM | 1 month   | P1M      |       45,000 |
| PREMIUM | 3 months  | P3M      |      125,000 |
| PREMIUM | 6 months  | P6M      |      230,000 |
| PREMIUM | 12 months | P1Y      |      440,000 |

Minimum amount: 250 IQD. Currency: IQD only.

### Backend Endpoints to Build

| Endpoint | Description |
| -------- | ----------- |
| `POST /subscriptions/initiate-fib` | Creates a FIB subscription → stores `FibSubscription` record (DRAFT) → returns subscriptionId + qrCode + appLink + readableCode to frontend |
| `POST /subscriptions/webhook/fib` | Receives FIB status callback → re-verifies via `fib.getSubscription()` → if ACTIVE/TRIAL, sets plan/status=ACTIVE in DB; if CANCELLED/REJECTED, downgrades to FREE ACTIVE |
| `GET /subscriptions/fib/:subscriptionId/status` | Frontend polls during the QR display flow; proxies to `fib.getSubscription()` |
| `DELETE /subscriptions/fib/:subscriptionId` | Merchant-side cancel (admin or user); calls `fib.cancelSubscription()` |
| `GET /users/me/subscription` | Returns authenticated user's full subscription record (plan, status, currentPeriodStart, currentPeriodEnd, paymentProvider) — marked done in backlog but never built |

### FibSubscription Table (Prisma)

A separate `FibSubscription` model is needed for audit trail and idempotency:

```
FibSubscription: id, userId, fibSubscriptionId (unique),
                 plan (GOLD|PREMIUM), intervalMonths (1|3|6|12),
                 amountIQD, status (DRAFT|TRIAL|ACTIVE|REJECTED|CANCELLED),
                 validUntil, activatedAt, cancelledAt
```

The `Subscription.externalSubscriptionId` field maps to `fibSubscriptionId`.
When status transitions to ACTIVE/TRIAL → update `Subscription.plan`, `Subscription.status=ACTIVE`, `Subscription.externalSubscriptionId`, `Subscription.paymentProvider=FIB`.

### Required Env Vars

```
FIB_CLIENT_ID=           # FIB-issued client ID (tutelage-test-sub for sandbox)
FIB_CLIENT_SECRET=       # server-only, never expose to browser or commit to code
FIB_ENV=stage            # 'stage' for dev/test, 'prod' for production (only these two values are valid)
FIB_WEBHOOK_URL=         # Public HTTPS URL FIB POSTs status changes to.
                         # REQUIRED in production when FIB_CLIENT_ID is set.
                         # Omit in local dev — activation falls back to client polling.
                         # Example: https://api.tutelage.ai/api/v1/subscriptions/webhook/fib
```

> **Startup guard:** If `NODE_ENV=production`, `FIB_CLIENT_ID` is set, and `FIB_WEBHOOK_URL` is missing, the server **refuses to start** with a clear error. This prevents silent fallback to the unreachable `http://localhost:...` URL.

Add all four vars to Infisical under both `dev` and `prod` environments.

### Environments

- **Sandbox base URL:** `https://fib-stage.fib.iq`
- **Production base URL:** `https://fib.prod.fib.iq` (requires live credentials from FIB)
- Dev environment always uses `FIB_ENV=stage` (never `dev` — only `stage` and `prod` are valid values)

### Reconciliation Cron Job

Webhook delivery is best-effort — if the server was down when FIB posted a callback, the subscription stays DRAFT until the user manually reopens the status screen.

`src/jobs/fib-reconcile.job.ts` runs every 15 minutes and reconciles all non-expired DRAFT subscriptions against the FIB API. It is a no-op when `FIB_CLIENT_ID` is not configured. The job calls `applyFibStatusChange` (same helper used by the webhook handler) so the DB sync logic is identical.

---

## Go-Live Runbook

Ordered steps to flip stage → production once FIB issues live credentials.

1. **Update Infisical `prod` environment:**
   - `FIB_ENV=prod`
   - `FIB_CLIENT_ID=<production client ID from FIB>`
   - `FIB_CLIENT_SECRET=<production secret from FIB>`
   - `FIB_WEBHOOK_URL=https://<your-backend-domain>/api/v1/subscriptions/webhook/fib`
   - `CORS_ORIGIN=https://<your-frontend-domain>`

2. **Verify the webhook endpoint is publicly reachable** with a valid TLS certificate before deploying — FIB validates this before accepting the URL.

3. **Deploy the backend.** On startup the server will log "4 jobs scheduled" including `fib-reconcile@*/15min`. Confirm no startup errors (especially the `FIB_WEBHOOK_URL` guard).

4. **Smoke test end-to-end with a real low-value subscription:**
   - POST `/subscriptions/initiate-fib` → get QR code
   - Approve in real FIB app
   - Verify webhook fires → `POST /subscriptions/webhook/fib` returns `202`
   - Verify DB shows `fibStatus=ACTIVE`, `subscription.plan=GOLD/PREMIUM`, `subscription.status=ACTIVE`
   - Cancel via `DELETE /subscriptions/fib/:id` → verify plan reverts to FREE ACTIVE

5. **Simulate a missed webhook:** let a DRAFT subscription sit for 15 min, confirm the reconciliation job promotes it to ACTIVE without any user action.

6. **Monitor** `logger` output in production for any `[fib-client]` errors after go-live.