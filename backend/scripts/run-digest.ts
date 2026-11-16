/**
 * One-shot script to run the weekly digest job manually.
 *
 * Usage:
 *   bun run job:digest             # respects local-Sunday-08:00 guard + 6-day dedup
 *   bun run job:digest -- --force  # skips both guards — sends to all opted-in students
 */
import { runWeeklyDigestJob } from "../src/jobs/weekly-digest.job.ts";

const force = process.argv.includes("--force");

if (force) {
  console.log("[run-digest] Force mode — skipping timezone and dedup guards");
}

await runWeeklyDigestJob({ force });
process.exit(0);
