/**
 * Provisions the dedicated test database: pushes the Prisma schema, then seeds it.
 * Run once before `bun test` (or whenever the schema/seed changes):
 *
 *   bun run test:setup        # via Infisical (reads TEST_DATABASE_URL from dev env)
 *   bun run test:setup:env    # without Infisical (reads TEST_DATABASE_URL from .env)
 *
 * Guards against accidentally resetting the dev/prod database.
 */
import { execSync } from "child_process";

const testUrl = process.env.TEST_DATABASE_URL;
const currentUrl = process.env.DATABASE_URL;

if (!testUrl) {
  console.error(
    "❌ TEST_DATABASE_URL is not set. Add it to Infisical (dev env) or your .env, " +
      "then re-run. It must point at a SEPARATE database from DATABASE_URL.",
  );
  process.exit(1);
}

if (currentUrl && currentUrl === testUrl) {
  console.error(
    "❌ TEST_DATABASE_URL equals DATABASE_URL. Refusing to wipe the dev/prod database. " +
      "Point TEST_DATABASE_URL at a dedicated test database.",
  );
  process.exit(1);
}

// Child processes (prisma + seed) read DATABASE_URL — override it with the test URL.
const childEnv = { ...process.env, DATABASE_URL: testUrl, NODE_ENV: "test" };

console.log("📦 Pushing Prisma schema to the test database...");
execSync("bunx prisma db push --skip-generate --accept-data-loss", {
  stdio: "inherit",
  env: childEnv,
});

console.log("\n🌱 Seeding the test database...");
execSync("bun prisma/seed.ts", { stdio: "inherit", env: childEnv });

console.log("\n✅ Test database ready. Run `bun run test:env` (or `bun run test`) to execute the suite.");
