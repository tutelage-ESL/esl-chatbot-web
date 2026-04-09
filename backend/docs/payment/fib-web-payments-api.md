# FIB (First Iraqi Bank) Web Payments API — Integration Documentation

> **Target Stack:** Express.js (Node.js backend)
> **SDK Package:** `@first-iraqi-bank/sdk`
> **Source Docs:** [FIB Web Payments](https://fib.iq/integrations/web-payments/) | [FIB Node.js SDK](https://first-iraqi-bank.github.io/fib-nodejs-payment-sdk/guide/index.html)

---

## Overview

The FIB Web Payments API is a RESTful payment service that allows web applications to accept payments from FIB bank account holders. It accepts JSON-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes. All requests must be made over HTTPS. The only supported currency is **IQD (Iraqi Dinar)**.

FIB provides an official **Node.js SDK** (`@first-iraqi-bank/sdk`) that wraps the REST API with a simple, type-safe interface built on top of the Fetch API. This is the recommended approach for Express.js applications.

---

## Environments

**Sandbox (Testing):**

- Base URL: `https://fib.stage.fib.iq`
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

**Important:**

- `access_token`: JWT Bearer token. Pass this to all subsequent API calls.
- `expires_in`: Token lifetime in seconds. **Tokens are very short-lived (typically 60 seconds).** Always fetch a new token before each API call if the current one may have expired.

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
- **Token lifetime is very short (~60 seconds).** Fetch a new token before each API call or implement refresh logic.
- **Only IQD currency is supported.**
- **Minimum payment amount is 250 IQD.**
- **The `statusCallbackUrl` is optional but strongly recommended.** It avoids polling. Your callback endpoint must accept POST requests and return HTTP 202, 406, or 500.
- **The `description` field is optional**, max 50 characters.
- **`expiresIn` range:** minimum 5 minutes, maximum 48 hours.
- **`refundableFor` range:** minimum 12 hours, maximum 7 days. Only set this if you want to support refunds.
- **Save payment details in your database.** Users might refresh or close the page.
- **For production**, change `FIB_ENV` to `prod` and use your production credentials.