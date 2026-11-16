// FIB smoke test — exercises our ACTUAL FibClient with the exact payload the
// subscriptions.service.ts builds (incl. the localhost statusCallbackUrl fallback
// used when FIB_WEBHOOK_URL is unset). Proves the real code path returns 201 and
// the created subscription is readable. The DRAFT it creates auto-expires at FIB
// (~24h) — it cannot be cancelled until a user pays it (FIB business rule).
//
// Run (no Infisical needed):
//   $env:FIB_CLIENT_ID="…"; $env:FIB_CLIENT_SECRET="…"; bun scripts/test-fib-client.ts
import { FibClient } from "../src/lib/fib-client.ts";

const clientId = process.env["FIB_CLIENT_ID"]!;
const clientSecret = process.env["FIB_CLIENT_SECRET"]!;
const port = process.env["PORT"] ?? "8000";

async function main(): Promise<void> {
  const client = new FibClient({ clientId, clientSecret, environment: "stage" });

  const statusCallbackUrl =
    process.env["FIB_WEBHOOK_URL"] ??
    `http://localhost:${port}/api/v1/subscriptions/webhook/fib`;

  console.log("Creating GOLD/1mo subscription via real FibClient…");
  const created = await client.createSubscription({
    title: "Tutelage GOLD",
    description: "GOLD English learning plan",
    amount: 25000,
    currency: "IQD",
    interval: "P1M",
    expiresIn: "P1DT12H",
    statusCallbackUrl,
  });
  console.log("✅ createSubscription OK:", {
    subscriptionId: created.subscriptionId,
    readableCode: created.readableCode,
    appLink: created.appLink,
    validUntil: created.validUntil,
    qrCode: created.qrCode?.slice(0, 30) + "…",
  });

  console.log("\nFetching status via getSubscription…");
  const details = await client.getSubscription(created.subscriptionId);
  console.log("✅ getSubscription OK — status:", details.status);

  console.log("\n🎉 FIB create + read works end-to-end (DRAFT auto-expires at FIB).");
}

main().catch((e: unknown) => { console.error("❌ Fatal:", e); process.exit(1); });
