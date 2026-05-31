import { describe, it, expect, afterAll } from "bun:test";
import {
  app,
  request,
  prisma,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../../test/helpers.ts";

// ───────────────────────────────────────────────────────────────────────────
// Dashboard — GET /api/v1/dashboard/overview
//
// Aggregates six sections in parallel (dashboard.service.ts). Tests assert both
// the full shape (fresh user → zeroed) and that the sections reflect underlying
// vocabulary / goals / metrics data.
// ───────────────────────────────────────────────────────────────────────────

const createdUserIds: string[] = [];
const track = (u: TestUser) => (createdUserIds.push(u.id), u);
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

afterAll(async () => {
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/dashboard/overview", () => {
  it("200 — returns all six sections with the expected shape for a fresh user", async () => {
    const u = track(await createTestUser());
    const res = await request(app).get("/api/v1/dashboard/overview").set(auth(u.token));
    expect(res.status).toBe(200);

    const d = res.body.data;
    // greetingHero
    expect(d.greetingHero).toMatchObject({ streak: 0, doneMins: 0, dueVocabCount: 0 });
    expect(d.greetingHero.goalMins).toBeGreaterThan(0);
    // statCards
    expect(d.statCards).toMatchObject({ wordsMastered: 0, levelPct: 0 });
    // vocabChart — always 6 weekly buckets
    expect(d.vocabChart.points.length).toBe(6);
    expect(d.vocabChart.totalWords).toBe(0);
    // nextUp — no active goals
    expect(d.nextUp.primary).toBeNull();
    expect(d.nextUp.others).toEqual([]);
    // activityHeatmap — 12 weeks × 7 days
    expect(d.activityHeatmap.weeks.length).toBe(12);
    expect(d.activityHeatmap.weeks.every((w: number[]) => w.length === 7)).toBe(true);
    expect(d.activityHeatmap.recentSessions).toEqual([]);
    // dueWords
    expect(d.dueWords.totalDue).toBe(0);
    expect(d.dueWords.words).toEqual([]);
  });

  it("200 — greetingHero.streak reflects the user's current streak", async () => {
    const u = track(await createTestUser({ metrics: { currentStreak: 5 } }));
    const res = await request(app).get("/api/v1/dashboard/overview").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.greetingHero.streak).toBe(5);
  });

  it("200 — due vocabulary appears in greetingHero + dueWords", async () => {
    const u = track(await createTestUser());
    await prisma.vocabulary.create({
      data: {
        userId: u.id,
        word: "ubiquitous",
        definition: "present everywhere",
        srsDue: new Date(Date.now() - 86400000), // overdue
      },
    });

    const res = await request(app).get("/api/v1/dashboard/overview").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.greetingHero.dueVocabCount).toBe(1);
    expect(res.body.data.dueWords.totalDue).toBe(1);
    expect(res.body.data.dueWords.words[0].word).toBe("ubiquitous");
  });

  it("200 — a mastered word counts toward statCards.wordsMastered", async () => {
    const u = track(await createTestUser());
    await prisma.vocabulary.create({
      data: {
        userId: u.id,
        word: "mastered",
        definition: "fully learned",
        masteryLevel: 5,
        srsDue: new Date(Date.now() + 30 * 86400000), // not due, so excluded from dueWords
      },
    });

    const res = await request(app).get("/api/v1/dashboard/overview").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.statCards.wordsMastered).toBe(1);
    expect(res.body.data.vocabChart.totalWords).toBe(1);
  });

  it("200 — an active goal becomes nextUp.primary", async () => {
    const u = track(await createTestUser());
    await prisma.goal.create({
      data: {
        userId: u.id,
        type: "VOCABULARY",
        description: "Learn 100 words",
        target: 100,
        status: "ACTIVE",
      },
    });

    const res = await request(app).get("/api/v1/dashboard/overview").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.nextUp.primary).not.toBeNull();
    expect(res.body.data.nextUp.primary.description).toBe("Learn 100 words");
    expect(res.body.data.nextUp.primary.type).toBe("VOCABULARY");
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/dashboard/overview");
    expect(res.status).toBe(401);
  });
});
