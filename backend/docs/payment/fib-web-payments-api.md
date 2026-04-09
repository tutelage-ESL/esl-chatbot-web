FIB (First Iraqi Bank) Web Payments API — Integration Documentation
Overview
The FIB Web Payments API is a RESTful payment service that allows web applications to accept payments from FIB bank account holders. It accepts JSON-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes. All requests must be made over HTTPS. The only supported currency is IQD (Iraqi Dinar).

Environments
There are two environments:
Sandbox (Testing):

Base URL: https://fib.stage.fib.iq
Register at the sandbox environment first to test before going live.

Production:

To get production credentials, submit the FIB Integration Request Form at: https://fibtask.atlassian.net/jira/software/c/form/366f78be-e7df-4e5c-acf9-56b94b5d7971?from=directory
FIB will provide production client_id and client_secret.


Authentication (OAuth2 Client Credentials)
All API requests must be authenticated using a Bearer Token obtained via the OAuth2 Client Credentials Grant Flow.
Token Endpoint:
POST https://fib.stage.fib.iq/auth/realms/fib-online-shop/protocol/openid-connect/token
Request: Content-Type: application/x-www-form-urlencoded
ParameterValuegrant_typeclient_credentialsclient_idYour client_id (provided by FIB)client_secretYour client_secret (provided by FIB)
cURL Example:
bashcurl --location --request POST 'https://fib.stage.fib.iq/auth/realms/fib-online-shop/protocol/openid-connect/token' \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode 'client_id=YOUR_CLIENT_ID' \
  --data-urlencode 'client_secret=YOUR_CLIENT_SECRET'
Response Example:
json{
  "access_token": "eyJhbGciOiJSUzI1NiIs...<JWT token>",
  "expires_in": 60,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...<refresh token>",
  "token_type": "bearer",
  "not-before-policy": 0,
  "session_state": "33d7ee97-7444-485d-bcb7-25af56797c07",
  "scope": "email profile"
}
```

**Important notes:**
- The `access_token` expires in **60 seconds** (`expires_in: 60`).
- The `refresh_token` expires in **1800 seconds** (30 minutes).
- You must include the `access_token` as a Bearer token in the `Authorization` header of all subsequent API calls.

---

## API Endpoints

### 1. Create Payment

**Endpoint:**
```
POST https://fib.stage.fib.iq/protected/v1/payments
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
Request Body (JSON):
json{
  "monetaryValue": {
    "amount": "500.00",
    "currency": "IQD"
  },
  "statusCallbackUrl": "https://YOUR_DOMAIN/your-callback-endpoint",
  "description": "Order description (max 50 chars)"
}
Request Body Fields:
FieldTypeRequiredDescriptionmonetaryValue.amountstringYesThe payment amount (e.g., "500.00")monetaryValue.currencystringYesMust be "IQD" (only supported currency)statusCallbackUrlstringNoURL that FIB will POST to when payment status changesdescriptionstringNoDescription shown in FIB app (max 50 characters)
Callback URL behavior: When the payment status changes, FIB sends a POST request to your statusCallbackUrl with this body:
json{
  "id": "<payment_id>",
  "status": "<payment_status>"
}
Your callback endpoint must return one of these HTTP status codes:

202 — Accepted
406 — Not accepted
500 — General error

Success Response (Create Payment):
json{
  "paymentId": "9dfa724f-4784-4487-811b-63057b540503",
  "readableCode": "S3LE-NZ2S-ZNGF",
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "validUntil": "2022-01-31T12:15:44.020920Z",
  "personalAppLink": "https://personal.stage.first-iraqi-bank.co/?link=...",
  "businessAppLink": "https://business.stage.first-iraqi-bank.co/?link=...",
  "corporateAppLink": "https://corporate.stage.first-iraqi-bank.co/?link=..."
}
```

**Response Fields:**

| Field            | Description |
|------------------|-------------|
| paymentId        | Unique identifier for the payment (UUID). Use this to check status or cancel. |
| qrCode           | Base64-encoded PNG image data URL of a QR code. User scans this with the FIB mobile app. |
| readableCode     | A short alphanumeric code the user can type manually in the FIB app if they can't scan the QR. |
| personalAppLink  | Deep link to open the payment in the FIB Personal app on mobile. |
| businessAppLink  | Deep link to open the payment in the FIB Business app on mobile. |
| corporateAppLink | Deep link to open the payment in the FIB Corporate app on mobile. |
| validUntil       | ISO-8601 date-time string indicating when the payment expires. |

---

### 2. Check Payment Status

**Endpoint:**
```
GET https://fib.stage.fib.iq/protected/v1/payments/{paymentId}/status
```

**Headers:**
```
Authorization: Bearer <access_token>
Path Parameter: paymentId — the UUID returned from the Create Payment endpoint.
Response Example:
json{
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

**Response Fields:**

| Field           | Description |
|-----------------|-------------|
| paymentId       | Unique identifier of the payment (UUID). |
| status          | One of: `PAID`, `UNPAID`, `DECLINED` |
| validUntil      | ISO-8601 date-time when the payment expires. |
| paidAt          | ISO-8601 date-time when payment was completed (null if not paid). |
| amount          | JSON object with `amount` (number) and `currency` (string). |
| decliningReason | One of: `SERVER_FAILURE`, `PAYMENT_EXPIRATION`, `PAYMENT_CANCELLATION` (null if not declined). |
| declinedAt      | ISO-8601 date-time when payment was declined (null if not declined). |
| paidBy          | JSON object with `name` (string) and `iban` (string) of the customer who paid (null if not paid). |

**Declining Reasons:**

| Value                 | Meaning |
|-----------------------|---------|
| SERVER_FAILURE        | Payment failed due to an internal server error. |
| PAYMENT_EXPIRATION    | Payment expired (past validUntil time). |
| PAYMENT_CANCELLATION  | Payment was cancelled by the user/merchant. |

---

### 3. Cancel Payment

**Endpoint:**
```
POST https://fib.stage.fib.iq/protected/v1/payments/{paymentId}/cancel
```

**Headers:**
```
Authorization: Bearer <access_token>
Path Parameter: paymentId — the UUID of the payment to cancel. Only active/unpaid payments can be cancelled.
Response: 204 No Content (empty body on success).
cURL Example:
bashcurl --location -g --request POST 'https://fib.stage.fib.iq/protected/v1/payments/{PAYMENT_ID}/cancel' \
  --header 'Authorization: Bearer <access_token>'

Typical Integration Flow

Authenticate: POST to the token endpoint with your client_id and client_secret to get an access_token.
Create Payment: POST to the payments endpoint with the amount in IQD. Receive a paymentId, QR code, readable code, and app deep links.
Display to User: Show the QR code image (or the readableCode, or the app deep links) to your customer so they can pay via the FIB app.
Monitor Status: Either poll the Check Payment Status endpoint using the paymentId, OR provide a statusCallbackUrl in step 2 so FIB notifies your server when the status changes.
Handle Outcome: When status is PAID, fulfill the order. When status is DECLINED, handle accordingly based on decliningReason.
Cancel (Optional): If needed, cancel an unpaid payment via the Cancel endpoint.


Key Implementation Notes

All requests require HTTPS. HTTP requests will fail.
Token lifetime is very short (60 seconds). Your application should request a new token before each API call, or implement token refresh logic using the refresh token (30 min lifetime).
Only IQD currency is supported.
The statusCallbackUrl is optional but recommended. It avoids the need for polling. Your callback endpoint must accept POST requests and return HTTP 202, 406, or 500.
The description field is optional, max 50 characters, and helps the customer identify the payment in the FIB app.
For production, replace the base URL https://fib.stage.fib.iq with the production URL that FIB provides along with your production credentials.

