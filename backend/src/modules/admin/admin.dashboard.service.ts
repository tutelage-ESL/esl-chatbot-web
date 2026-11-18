import type { Plan } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import type { AdminDashboardData } from "./admin.types.ts";

// Admin home dashboard: growth, the learner funnel, money, AI usage (the main running
// cost) and anything that needs fixing. Internal (stealth) accounts never count.
// Weeks are rolling 7-day windows, compared with the 7 days before.

const DAY = 86_400_000;
const real = { isInternal: false } as const;

/** A paid plan only counts while its period hasn't ended (expiry downgrades lazily). */
const payingNow = (now: Date) => ({
  status: "ACTIVE" as const,
  plan: { not: "FREE" as const },
  OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
  user: real,
});

async function activeLearners(since: Date, until?: Date): Promise<string[]> {
  const rows = await prisma.message.groupBy({
    by: ["userId"],
    where: { role: "USER", createdAt: { gte: since, ...(until && { lt: until }) }, user: real },
  });
  return rows.map((r) => r.userId);
}

export async function getAdminDashboardStats(): Promise<AdminDashboardData> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY);
  const dayAgo = new Date(now.getTime() - DAY);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [
    byRole, newThisWeek, newLastWeek,
    active24h, activeThisWeek, activeLastWeek, messagesThisWeek, messagesLastWeek,
    verified, practised, paidByPlan, freeActive, expiredUnpaid, paidByProvider,
    fibThisMonth, fibLastMonth, expiring, unverifiedStuck, fibStuck,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], where: real, _count: { _all: true } }),
    prisma.user.count({ where: { ...real, createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { ...real, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    activeLearners(dayAgo),
    activeLearners(weekAgo),
    activeLearners(twoWeeksAgo, weekAgo),
    prisma.message.count({ where: { role: "USER", createdAt: { gte: weekAgo }, user: real } }),
    prisma.message.count({ where: { role: "USER", createdAt: { gte: twoWeeksAgo, lt: weekAgo }, user: real } }),
    // Funnel: students who signed up → verified (subscription active) → practised → pay
    prisma.user.count({ where: { ...real, role: "STUDENT", subscription: { status: "ACTIVE" } } }),
    prisma.user.count({ where: { ...real, role: "STUDENT", messages: { some: { role: "USER" } } } }),
    prisma.subscription.groupBy({ by: ["plan"], where: payingNow(now), _count: { _all: true } }),
    prisma.subscription.count({ where: { status: "ACTIVE", plan: "FREE", user: real } }),
    prisma.subscription.count({ where: { status: "ACTIVE", plan: { not: "FREE" }, currentPeriodEnd: { lte: now }, user: real } }),
    prisma.subscription.groupBy({ by: ["paymentProvider"], where: payingNow(now), _count: { _all: true } }),
    // FIB: money from subscriptions activated in the month (renewal charges are not stored)
    prisma.fibSubscription.aggregate({ where: { activatedAt: { gte: monthStart } }, _sum: { amountIQD: true }, _count: { _all: true } }),
    prisma.fibSubscription.aggregate({ where: { activatedAt: { gte: lastMonthStart, lt: monthStart } }, _sum: { amountIQD: true }, _count: { _all: true } }),
    prisma.subscription.findMany({
      where: { ...payingNow(now), currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + 7 * DAY) } },
      orderBy: { currentPeriodEnd: "asc" },
      take: 8,
      select: { plan: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, user: { select: { id: true, displayName: true, username: true } } },
    }),
    prisma.subscription.count({ where: { status: "INACTIVE", createdAt: { lt: dayAgo }, user: { ...real, role: "STUDENT" } } }),
    prisma.fibSubscription.count({ where: { fibStatus: "DRAFT", createdAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) } } }),
  ]);

  // AI usage this week by plan (messages are the main AI cost)
  const usage = await prisma.message.groupBy({
    by: ["userId"],
    where: { role: "USER", createdAt: { gte: weekAgo }, user: real },
    _count: { _all: true },
  });
  const plans = await prisma.subscription.findMany({
    where: { userId: { in: usage.map((u) => u.userId) } },
    select: { userId: true, plan: true },
  });
  const planOf = new Map(plans.map((p) => [p.userId, p.plan]));
  const aiUsage: Record<Plan, number> = { FREE: 0, GOLD: 0, PREMIUM: 0 };
  for (const u of usage) aiUsage[planOf.get(u.userId) ?? "FREE"] += (u._count as { _all: number })._all;

  const role = new Map(byRole.map((r) => [r.role, (r._count as { _all: number })._all]));
  const paid = new Map(paidByPlan.map((p) => [p.plan, (p._count as { _all: number })._all]));
  const students = role.get("STUDENT") ?? 0;

  return {
    users: {
      total: [...role.values()].reduce((a, b) => a + b, 0),
      students,
      tutors: role.get("TUTOR") ?? 0,
      admins: role.get("ADMIN") ?? 0,
      newThisWeek,
      newLastWeek,
    },
    activity: {
      active24h: active24h.length,
      activeThisWeek: activeThisWeek.length,
      activeLastWeek: activeLastWeek.length,
      messagesThisWeek,
      messagesLastWeek,
    },
    funnel: {
      signedUp: students,
      verified,
      practised,
      paying: (paid.get("GOLD") ?? 0) + (paid.get("PREMIUM") ?? 0),
    },
    plans: { FREE: freeActive, GOLD: paid.get("GOLD") ?? 0, PREMIUM: paid.get("PREMIUM") ?? 0, expiredNotDowngraded: expiredUnpaid },
    revenue: {
      fibThisMonthIQD: fibThisMonth._sum.amountIQD ?? 0,
      fibThisMonthCount: (fibThisMonth._count as { _all: number })._all,
      fibLastMonthIQD: fibLastMonth._sum.amountIQD ?? 0,
      payingByProvider: Object.fromEntries(
        paidByProvider.map((p) => [p.paymentProvider ?? "UNKNOWN", (p._count as { _all: number })._all]),
      ),
    },
    expiringSoon: expiring.map((s) => ({
      userId: s.user.id,
      name: s.user.displayName || s.user.username,
      plan: s.plan,
      endsAt: s.currentPeriodEnd!,
      cancelling: s.cancelAtPeriodEnd,
    })),
    aiUsage,
    attention: { unverifiedOver24h: unverifiedStuck, fibPaymentsStuck: fibStuck },
  };
}
