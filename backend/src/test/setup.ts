/**
 * Bun test preload — runs ONCE before any test file (and before any test file's
 * transitive imports of env.ts / database.ts / app.ts) is evaluated.
 *
 * Responsibilities, in order:
 *   1. Redirect Prisma to a dedicated TEST database (never the dev/prod one).
 *   2. Mock the AI layer so message/session tests are deterministic and free.
 *
 * Wired up via bunfig.toml `[test] preload`. See docs/testing.md for setup.
 */
import { mock } from "bun:test";

// ── 1. Redirect to the dedicated test database ────────────────────────────────
// This MUST happen before env.ts or database.ts are imported anywhere, because
// both read process.env.DATABASE_URL at module-eval time. Preload guarantees
// this file runs first, so the override is in place before those imports load.

const testUrl = process.env.TEST_DATABASE_URL;
const currentUrl = process.env.DATABASE_URL;

if (!testUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Integration tests must run against a dedicated " +
      "test database — never the dev or prod one. Add TEST_DATABASE_URL to Infisical " +
      "(dev env) or your .env, then run `bun run test:setup` once. See backend/docs/testing.md.",
  );
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to run the test suite with NODE_ENV=production.");
}

if (currentUrl && currentUrl === testUrl) {
  throw new Error(
    "TEST_DATABASE_URL is identical to DATABASE_URL. Refusing to run tests against the " +
      "dev/prod database (the seed step wipes all data). Point TEST_DATABASE_URL at a separate DB.",
  );
}

process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = "test"; // keeps rate limiters disabled (prod-only) and behavior deterministic

// ── 3. Stub FIB credentials ───────────────────────────────────────────────────
// Without these, config/fib.ts exports `fib = null` and every subscription
// route returns 503. We set fake credentials so the FibClient is instantiated
// (non-null), then test files spy on its public methods before each test so
// no actual network call to fib-stage.fib.iq is ever made.
process.env.FIB_CLIENT_ID = "test-client-id";
process.env.FIB_CLIENT_SECRET = "test-client-secret";
// FIB_ENV defaults to "stage" — no override needed

// ── 2. Mock the AI layer ──────────────────────────────────────────────────────
// generateAIResponse would otherwise call real Gemini/OpenAI in dev (a key is
// injected by Infisical), making message/session tests slow, costly, and flaky.
// Mocking at the ai.service boundary also prevents provider SDK clients from
// being constructed at import time. Shapes mirror ai.types.ts (AIResponse / STTResult).

// `__aiContextLength` records how many history messages the service passed to the
// AI on the most recent call. The FREE-vs-default LLM context window (10 vs 20) is
// otherwise invisible at the HTTP boundary, so the Messages suite reads this to
// verify the cost-control truncation. Harmless for every other test.
mock.module("../modules/ai/ai.service.ts", () => ({
  generateAIResponse: async (
    _userMessage: string,
    recentMessages?: unknown[],
  ) => {
    (globalThis as Record<string, unknown>).__aiContextLength = recentMessages?.length ?? 0;
    return {
    reply: "[mock AI] This is a deterministic test reply.",
    evaluation: {
      grammarScore: 80,
      grammarErrors: [],
      vocabularyScore: 70,
      vocabularyLevel: "B1",
      fluencyScore: 75,
      overallScore: 76,
      detectedCefrLevel: "B1",
      corrections: [],
      feedback: "Mock feedback — deterministic for tests.",
      newWords: [],
    },
    };
  },
  generateTTS: async () => Buffer.alloc(0),
  transcribeAudio: async () => ({
    transcript: "[mock transcript]",
    pronunciationScore: null,
    pronunciationIssues: [],
  }),
}));
