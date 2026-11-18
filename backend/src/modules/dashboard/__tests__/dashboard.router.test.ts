import { describe, it, expect, afterAll } from "bun:test";
import {
  app,
  request,
  prisma,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../../test/helpers.ts";
import { learnerDay, shiftDays } from "../../../utils/learnerDay.ts";
import { recordPractice } from "../../metrics/practice.service.ts";
import { runStreakResetJob } from "../../../jobs/streak-reset.job.ts";
import { runStaleSessionCleanupJob } from "../../../jobs/stale-session-cleanup.job.ts";

// ───────────────────────────────────────────────────────────────────────────
// Learner dashboard — GET /api/v1/dashboard/overview — and the practice bookkeeping
// behind it: practice is recorded per message (no "End session" needed), days are the
// learner's own calendar days, streaks survive yesterday, idle chats get closed.
// Test users have no learner profile, so their time zone is UTC.
// ───────────────────────────────────────────────────────────────────────────

const createdUserIds: string[] = [];
const track = (u: TestUser) => { createdUserIds.push(u.id); return u; };
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const overview = (u: TestUser) => request(app).get("/api/v1/dashboard/overview").set(auth(u.token));
const today = () => learnerDay("UTC");

afterAll(async () => {
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

async function userMessage(userId: string, sessionId: string, at: Date) {
  return prisma.message.create({ data: { userId, sessionId, role: "USER", content: "hello there", createdAt: at }, select: { id: true } });
}

describe("GET /api/v1/dashboard/overview", () => {
  it("200 — a fresh learner gets every section, zeroed", async () => {
    const u = track(await createTestUser());
    const res = await overview(u);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.today).toMatchObject({ minutes: 0, streak: 0 });
    expect(d.today.dailyGoalMinutes).toBeGreaterThan(0);
    expect(d.week.days).toHaveLength(7);
    expect(d.skills).toMatchObject({ grammar: null, basedOnMessages: 0 });
    expect(d.vocab).toMatchObject({ total: 0, due: 0, mastered: 0, addedThisWeek: 0, dueWords: [] });
    expect(d.tasks).toEqual([]);
    expect(d.goals).toEqual([]);
    expect(d.activity.weeks).toHaveLength(12);
    expect(d.activity.weeks.every((w: unknown[]) => w.length === 7)).toBe(true);
    expect(d.recentChats).toEqual([]);
  });

  it("200 — a streak counts only while they studied today or yesterday", async () => {
    const alive = track(await createTestUser({ metrics: { currentStreak: 5, lastStudyDate: shiftDays(today(), -1) } }));
    const stale = track(await createTestUser({ metrics: { currentStreak: 5, lastStudyDate: shiftDays(today(), -3) } }));
    expect((await overview(alive)).body.data.today.streak).toBe(5);
    expect((await overview(stale)).body.data.today.streak).toBe(0);
  });

  it("200 — due words and mastered words show in vocab", async () => {
    const u = track(await createTestUser());
    await prisma.vocabulary.create({ data: { userId: u.id, word: "ubiquitous", definition: "everywhere", srsDue: new Date(Date.now() - 60_000) } });
    await prisma.vocabulary.create({ data: { userId: u.id, word: "candid", definition: "honest", masteryLevel: 5, srsDue: new Date(Date.now() + 86_400_000) } });
    const d = (await overview(u)).body.data;
    expect(d.vocab).toMatchObject({ total: 2, due: 1, mastered: 1, addedThisWeek: 2 });
    expect(d.vocab.dueWords[0].word).toBe("ubiquitous");
  });

  it("200 — an active goal is listed", async () => {
    const u = track(await createTestUser());
    await prisma.goal.create({ data: { userId: u.id, type: "VOCABULARY", description: "Learn 50 words", target: 50 } });
    const d = (await overview(u)).body.data;
    expect(d.goals[0]).toMatchObject({ description: "Learn 50 words", target: 50 });
  });
});

describe("Practice is recorded per message", () => {
  it("adds active minutes, today's progress and a streak without ending the chat", async () => {
    const u = track(await createTestUser({ metrics: { currentStreak: 3, lastStudyDate: shiftDays(today(), -1) } }));
    const session = await prisma.conversationSession.create({ data: { userId: u.id }, select: { id: true } });
    const t0 = new Date(Date.now() - 4 * 60_000);
    await userMessage(u.id, session.id, t0);
    await recordPractice(u.id, session.id, 5); // first message: 1 minute
    await userMessage(u.id, session.id, new Date(t0.getTime() + 3 * 60_000));
    await recordPractice(u.id, session.id, 4); // kept going: +3 minutes

    const row = await prisma.progress.findUnique({ where: { userId_date: { userId: u.id, date: today() } } });
    expect(row).toMatchObject({ studyMinutes: 4, messagesCount: 2, wordsTyped: 9, sessionsCount: 1 });
    const m = await prisma.userMetrics.findUnique({ where: { userId: u.id } });
    expect(m).toMatchObject({ currentStreak: 4, totalStudyTimeMinutes: 4 });
    expect(m!.lastStudyDate!.getTime()).toBe(today().getTime());
  });

  it("a long break counts as a fresh start, not as study time", async () => {
    const u = track(await createTestUser());
    const session = await prisma.conversationSession.create({ data: { userId: u.id }, select: { id: true } });
    const t0 = new Date(Date.now() - 90 * 60_000);
    await userMessage(u.id, session.id, t0);
    await recordPractice(u.id, session.id, 1);
    await userMessage(u.id, session.id, new Date());
    await recordPractice(u.id, session.id, 1);
    const row = await prisma.progress.findUnique({ where: { userId_date: { userId: u.id, date: today() } } });
    expect(row!.studyMinutes).toBe(2);
  });
});

describe("Scheduled jobs", () => {
  it("streak reset keeps learners who studied yesterday and resets the ones who missed a day", async () => {
    const yesterday = track(await createTestUser({ metrics: { currentStreak: 4, lastStudyDate: shiftDays(today(), -1) } }));
    const missed = track(await createTestUser({ metrics: { currentStreak: 4, lastStudyDate: shiftDays(today(), -2) } }));
    await runStreakResetJob();
    expect((await prisma.userMetrics.findUnique({ where: { userId: yesterday.id } }))!.currentStreak).toBe(4);
    expect((await prisma.userMetrics.findUnique({ where: { userId: missed.id } }))!.currentStreak).toBe(0);
  });

  it("closes chats idle for 24h with their duration up to the last message", async () => {
    const u = track(await createTestUser());
    const started = new Date(Date.now() - 30 * 3600_000);
    const idle = await prisma.conversationSession.create({ data: { userId: u.id, startedAt: started }, select: { id: true } });
    await userMessage(u.id, idle.id, new Date(started.getTime() + 10 * 60_000));
    const busy = await prisma.conversationSession.create({ data: { userId: u.id, startedAt: started }, select: { id: true } });
    await userMessage(u.id, busy.id, new Date(Date.now() - 60_000));

    await runStaleSessionCleanupJob();
    const [a, b] = await Promise.all([
      prisma.conversationSession.findUnique({ where: { id: idle.id } }),
      prisma.conversationSession.findUnique({ where: { id: busy.id } }),
    ]);
    expect(a!.endedAt).not.toBeNull();
    expect(a!.durationSeconds).toBe(600);
    expect(b!.endedAt).toBeNull();
  });
});
