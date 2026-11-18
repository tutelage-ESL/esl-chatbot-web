import { prisma } from "../config/database.ts";

// Every "today", "yesterday" and "this week" for a learner is THEIR calendar day, not the
// server's: the server runs in UTC while most learners are in Iraq (UTC+3), so a server
// "today" is still yesterday for them between 00:00 and 03:00.
//
// A day is represented the way Prisma stores `@db.Date`: a Date at UTC midnight of that
// calendar day. Compare days with getTime(), never with local-time Date methods.

const DAY_MS = 86_400_000;

/** A valid IANA zone, falling back to UTC (bad values in the DB would make Intl throw). */
export function safeTimezone(tz: string | null | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** The learner's calendar day at `at`, as UTC midnight of that day. */
export function learnerDay(tz: string, at: Date = new Date()): Date {
  // en-CA formats as YYYY-MM-DD
  const [y, m, d] = at.toLocaleDateString("en-CA", { timeZone: tz }).split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export const shiftDays = (day: Date, n: number) => new Date(day.getTime() + n * DAY_MS);

export const sameDay = (a: Date | null | undefined, b: Date) => !!a && a.getTime() === b.getTime();

/** Monday of the learner's week containing `day` (weeks start on Monday). */
export function weekStart(day: Date): Date {
  const offset = (day.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return shiftDays(day, -offset);
}

export async function timezoneOf(userId: string): Promise<string> {
  const profile = await prisma.learnerProfile.findUnique({ where: { userId }, select: { timezone: true } });
  return safeTimezone(profile?.timezone);
}
