// Diagnostic script — tries every plausible FIB Subscription payload variation
// to isolate WHY FIB returns 400 INVALID_REQUEST.
//
// Run with:   bun scripts/test-fib.ts
// (Infisical not required — uses process.env directly.)

const CLIENT_ID = process.env["FIB_CLIENT_ID"];
const CLIENT_SECRET = process.env["FIB_CLIENT_SECRET"];
const BASE_URL = "https://fib-stage.fib.iq";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing FIB_CLIENT_ID or FIB_CLIENT_SECRET in env.");
  console.error("Run via Infisical:   infisical run -- bun scripts/test-fib.ts");
  process.exit(1);
}

// ── 1. Get token ─────────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const res = await fetch(
    `${BASE_URL}/auth/realms/fib-online-shop/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
      }).toString(),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    console.error("AUTH FAILED:", res.status, text);
    process.exit(1);
  }
  const data = JSON.parse(text) as { access_token: string };
  return data.access_token;
}

function decodeJwt(token: string): unknown {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = parts[1]!;
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  const json = Buffer.from(padded, "base64").toString("utf-8");
  return JSON.parse(json);
}

// ── 2. Test runner ───────────────────────────────────────────────────────────

async function tryPayload(
  label: string,
  endpoint: string,
  payload: Record<string, unknown>,
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": "en",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const ok = res.ok ? "✅" : "❌";
  console.log(`\n${ok} [${label}] HTTP ${res.status}`);
  console.log(`   payload: ${JSON.stringify(payload)}`);
  console.log(`   body:    ${text.slice(0, 400)}`);
}

// ── 3. Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=".repeat(80));
  console.log("FIB Subscription API diagnostic");
  console.log("=".repeat(80));

  const token = await getToken();
  console.log("\n✅ Auth OK — got token");
  const decoded = decodeJwt(token);
  console.log("   Token claims:", JSON.stringify(decoded, null, 2));

  // Test 1 — exact payload our fib-client.ts sends today
  await tryPayload(
    "1. CURRENT (fibsubscribe shape, amount as String)",
    "/protected/v1/subscriptions",
    {
      title: "Tutelage GOLD",
      description: "GOLD English learning plan",
      monetaryValue: { amount: "25000", currency: "IQD" },
      interval: "P1M",
      expiresIn: "P1DT12H",
    },
    token,
  );

  // Test 2 — amount as number
  await tryPayload(
    "2. amount as NUMBER",
    "/protected/v1/subscriptions",
    {
      title: "Tutelage GOLD",
      description: "GOLD English learning plan",
      monetaryValue: { amount: 25000, currency: "IQD" },
      interval: "P1M",
      expiresIn: "P1DT12H",
    },
    token,
  );

  // Test 3 — minimal (no description, no expiresIn)
  await tryPayload(
    "3. MINIMAL (only required: title, monetaryValue, interval)",
    "/protected/v1/subscriptions",
    {
      title: "Test",
      monetaryValue: { amount: "1000", currency: "IQD" },
      interval: "P1M",
    },
    token,
  );

  // Test 4 — minimal with low amount as number
  await tryPayload(
    "4. MINIMAL + low amount as NUMBER",
    "/protected/v1/subscriptions",
    {
      title: "Test",
      monetaryValue: { amount: 1000, currency: "IQD" },
      interval: "P1M",
    },
    token,
  );

  // Test 5 — top-level amount/currency (no monetaryValue wrapper)
  await tryPayload(
    "5. FLAT (no monetaryValue wrapper)",
    "/protected/v1/subscriptions",
    {
      title: "Test",
      amount: 1000,
      currency: "IQD",
      interval: "P1M",
    },
    token,
  );

  // Test 6 — alternate interval format
  await tryPayload(
    "6. interval as 'MONTHLY' instead of 'P1M'",
    "/protected/v1/subscriptions",
    {
      title: "Test",
      monetaryValue: { amount: "1000", currency: "IQD" },
      interval: "MONTHLY",
    },
    token,
  );

  // Test 7 — Web Payments endpoint to confirm if credentials work for payments
  await tryPayload(
    "7. WEB PAYMENTS endpoint (sanity check: do creds work for payments?)",
    "/protected/v1/payments",
    {
      monetaryValue: { amount: 1000, currency: "IQD" },
      description: "Test payment",
    },
    token,
  );

  console.log("\n" + "=".repeat(80));
  console.log("Done. The first ✅ row tells us the payload shape FIB accepts.");
  console.log("If ALL rows are ❌, the credentials likely need FIB-side activation.");
  console.log("=".repeat(80));
}

main().catch((e: unknown) => {
  console.error("Fatal:", e);
  process.exit(1);
});
