/**
 * Utilities for generating and managing class join codes.
 *
 * A class code is a short, human-typeable token (8 chars by default,
 * uppercase alphanumeric without ambiguous characters like 0/O/1/I).
 * Each class has at most one active code; rotating produces a new value
 * and updates `classCodeRefreshedAt` and `classCodeExpiresAt`.
 */

import { randomInt } from "crypto";

// Excludes 0/O/1/I/L to avoid confusion when typed by hand.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/** Generate a fresh random class code (no DB uniqueness check). */
export function generateClassCode(length: number = CODE_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Compute the expiry timestamp for a freshly minted code.
 * Returns null when the code should never expire automatically
 * (interval is null or <= 0).
 */
export function computeExpiryFromInterval(
  intervalSeconds: number | null | undefined,
  refreshedAt: Date = new Date(),
): Date | null {
  if (intervalSeconds == null || intervalSeconds <= 0) return null;
  return new Date(refreshedAt.getTime() + intervalSeconds * 1000);
}

/** True when an expiry timestamp is set and is in the past. */
export function isExpired(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= now.getTime();
}

// ── Refresh interval bounds (used by Zod) ───────────────────
// Minimum 60 seconds prevents accidental DDoS-on-self by setting a 1s
// interval. Maximum is ~100 years (in seconds) so a tutor can effectively
// make a code "permanent" without needing a separate flag.
export const MIN_REFRESH_INTERVAL_SECONDS = 60;
export const MAX_REFRESH_INTERVAL_SECONDS = 100 * 365 * 24 * 60 * 60; // ~100 years

// ── Common interval presets (seconds) — used by frontend dropdowns ──
export const REFRESH_INTERVAL_PRESETS = {
  daily: 24 * 60 * 60,
  weekly: 7 * 24 * 60 * 60,
  monthly: 30 * 24 * 60 * 60,
  yearly: 365 * 24 * 60 * 60,
  permanent: MAX_REFRESH_INTERVAL_SECONDS,
} as const;
