/**
 * Helpers for 429 responses. Every "slow down" answer carries the wait in three
 * places: the `Retry-After` header (seconds), a `retryAfter` body field (seconds),
 * and a human sentence in `message`.
 */

/** "45 seconds", "1 minute", "3 hours" — rounded up so we never promise too early. */
export function waitText(seconds: number): string {
  const [count, unit] =
    seconds < 60
      ? [Math.max(1, Math.ceil(seconds)), "second"]
      : seconds < 3600
        ? [Math.ceil(seconds / 60), "minute"]
        : [Math.ceil(seconds / 3600), "hour"];
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/**
 * Seconds until the next local midnight — when the daily plan counters reset.
 * Matches the `todayStart.setHours(0, 0, 0, 0)` windows the services count in.
 */
export function secondsUntilNextDay(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}
