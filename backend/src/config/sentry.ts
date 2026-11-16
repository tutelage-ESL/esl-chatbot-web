import * as Sentry from "@sentry/node";
import { env } from "./env.ts";

// Only active in production with a DSN set.
// In dev/test: init() with enabled:false so captureException() calls are safe no-ops.
Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  enabled: env.NODE_ENV === "production" && !!env.SENTRY_DSN,

  // Capture 10% of transactions for performance tracing — adjust once real traffic data exists
  tracesSampleRate: 0.1,

  // Safety-net filter: never alert on operational AppErrors (4xx).
  // The primary filter is in errorHandler.ts (only calls captureException for 500s),
  // but this guards against any path that bypasses that check.
  beforeSend(event, hint) {
    const err = hint?.originalException;
    if (err && typeof err === "object" && "statusCode" in err) {
      if ((err as { statusCode: number }).statusCode < 500) return null;
    }
    return event;
  },
});

export { Sentry };
