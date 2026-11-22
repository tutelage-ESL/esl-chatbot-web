import type { Plan } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import type { AdminDashboardData } from "./admin.types.ts";
import { classesSection, learningSection, peopleSection, trendSection } from "./admin.insights.ts";

// Admin home dashboard: growth, the learner funnel, money, AI usage (the main running
// cost) and anything that needs fixing. Internal (stealth) accounts never count.
// Weeks are rolling 7-day windows, compared with the 7 days before.

const DAY = 86_400_000;
const real = { isInternal: false } as const;

const student = { ...real, role: "STUDENT" as const };

/** A paid plan only counts while its period hasn't ended (expiry downgrades lazily). Students only. */
const payingNow = (now: Date) => ({
  status: "ACTIVE" as const,
  plan: { not: "FREE" as const },
  OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
  user: student,
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
    verified, practised, paidByPlan, expiredUnpaid, paidByProvider,
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
    // Funnel: students who signed up → verified (email confirmed or Google linked — both set
    // emailVerified) → practised → pay. An admin-assigned plan is not a verification.
    prisma.user.count({ where: { ...student, emailVerified: true } }),
    prisma.user.count({ where: { ...real, role: "STUDENT", messages: { some: { role: "USER" } } } }),
    prisma.subscription.groupBy({ by: ["plan"], where: payingNow(now), _count: { _all: true } }),
    prisma.subscription.count({ where: { status: "ACTIVE", plan: { not: "FREE" }, currentPeriodEnd: { lte: now }, user: student } }),
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
    prisma.user.count({ where: { ...student, emailVerified: false, createdAt: { lt: dayAgo } } }),
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

  const weekUsage = usage.map((u) => ({ userId: u.userId, count: (u._count as { _all: number })._all }));
  const [people, classes, trend, learning] = await Promise.all([
    peopleSection(now), classesSection(), trendSection(now), learningSection(now, weekUsage),
  ]);

  const role = new Map(byRole.map((r) => [r.role, (r._count as { _all: number })._all]));
  const paid = new Map(paidByPlan.map((p) => [p.plan, (p._count as { _all: number })._all]));
  const students = role.get("STUDENT") ?? 0;
  const gold = paid.get("GOLD") ?? 0;
  const premium = paid.get("PREMIUM") ?? 0;

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
      paying: gold + premium,
    },
    // Every student is on exactly one plan: anyone not paying right now is on Free
    // (incl. unverified and expired-not-yet-downgraded), so the three add up to `students`.
    plans: { FREE: students - gold - premium, GOLD: gold, PREMIUM: premium, expiredNotDowngraded: expiredUnpaid },
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
    people,
    classes,
    trend,
    learning,
  };
}
