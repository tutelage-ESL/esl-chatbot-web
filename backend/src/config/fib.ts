import { FibClient } from "../lib/fib-client.ts";
import { env } from "./env.ts";

// Instantiated lazily — server starts even without credentials.
// Any service that calls FIB must call requireFib() first, which throws AppError(503) if null.
export const fib =
  env.FIB_CLIENT_ID && env.FIB_CLIENT_SECRET
    ? new FibClient({
        clientId: env.FIB_CLIENT_ID,
        clientSecret: env.FIB_CLIENT_SECRET,
        environment: env.FIB_ENV === "prod" ? "production" : "stage",
      })
    : null;
