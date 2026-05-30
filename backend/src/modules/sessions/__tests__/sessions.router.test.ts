import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  app,
  request,
  prisma,
  SEED,
  login,
  expiredToken,
  wrongSecretToken,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../../test/helpers.ts";

// ───────────────────────────────────────────────────────────────────────────
// Sessions integration tests.
//
// Every mutating test uses a dedicated createTestUser() so the shared seed
// users' metrics/progress are never disturbed. All created users are tracked
// and deleted in afterAll (cascade removes sessions/messages/evals/progress).
// AI is mocked in src/test/setup.ts, but these tests insert messages +
// evaluations directly via Prisma so end-session aggregation is deterministic
// without going through the message endpoint (covered in Phase 3).
// ───────────────────────────────────────────────────────────────────────────

// Valid v4 UUID (passes Zod .uuid()) that will never exist in the DB, so the
// service lookup returns 404 rather than the route's validation returning 422.
const NONEXISTENT_ID = "00000000-0000-4000-8000-000000000000";
const createdUserIds: string[] = [];

/** Mirrors the EMA formula in sessions.service.ts so float arithmetic matches exactly. */
const ema = (old: number, newVal: number) =>
  newVal > 0 ? Math.round((old * 0.85 + newVal * 0.15) * 10) / 10 : old;

function track(u: TestUser): TestUser {
  createdUserIds.push(u.id);
  return u;
}

/** Creates a raw conversation session row for a user. */
async function makeSession(
  userId: string,
  opts: { mode?: "TEXT" | "VOICE"; ended?: boolean } = {},
) {
  return prisma.conversationSession.create({
    data: {
      userId,
      mode: opts.mode ?? "TEXT",
      ...(opts.ended ? { endedAt: new Date(), durationSeconds: 600 } : {}),
    },
    select: { id: true },
  });
}

/** Adds a USER message with an evaluation (deterministic scores) to a session. */
async function addEvaluatedMessage(
  sessionId: string,
  userId: string,
  scores: { grammar: number; vocab: number; fluency: number; overall: number; words: number },
) {
  const msg = await prisma.message.create({
    data: {
      userId,
      sessionId,
      role: "USER",
      type: "TEXT",
      content: "test message content",
      wordCount: scores.words,
    },
    select: { id: true },
  });
  await prisma.messageEvaluation.create({
    data: {
      messageId: msg.id,
      grammarScore: scores.grammar,
      grammarErrors: [],
      vocabularyScore: scores.vocab,
      vocabularyLevel: "B1",
      fluencyScore: scores.fluency,
      overallScore: scores.overall,
      detectedCefrLevel: "B1",
      corrections: [],
      feedback: "test feedback",
    },
  });
}

afterAll(async () => {
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/sessions — create", () => {
  it("201 — creates a session for an active subscription", async () => {
    const user = track(await createTestUser({ plan: "FREE", status: "ACTIVE" }));
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ mode: "TEXT", topic: "Travel" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mode).toBe("TEXT");
    expect(res.body.data.topic).toBe("Travel");
    expect(res.body.data.endedAt).toBeNull();
  });

  it("201 — defaults to TEXT mode when no body is sent", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${user.token}`)
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.data.mode).toBe("TEXT");
  });

  it("401 — no token", async () => {
    const res = await request(app).post("/api/v1/sessions").send({ mode: "TEXT" });
    expect(res.status).toBe(401);
  });

  it("403 — subscription is INACTIVE", async () => {
    const user = track(await createTestUser({ plan: "FREE", status: "INACTIVE" }));
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ mode: "TEXT" });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/active subscription/i);
  });

  it("403 — no subscription row at all", async () => {
    const user = track(await createTestUser({ plan: null }));
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ mode: "TEXT" });
    expect(res.status).toBe(403);
  });

  it("422 — invalid mode", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ mode: "AUDIO" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it("422 — topic exceeds 200 chars", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ mode: "TEXT", topic: "x".repeat(201) });
    expect(res.status).toBe(422);
  });

  it("429 — FREE plan daily session cap (3) is enforced", async () => {
    const user = track(await createTestUser({ plan: "FREE", status: "ACTIVE" }));
    for (let i = 0; i < 3; i++) {
      const ok = await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ mode: "TEXT" });
      expect(ok.status).toBe(201);
    }
    const blocked = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ mode: "TEXT" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/daily session limit/i);
  });

  it("201 + lazy downgrade — expired PREMIUM becomes FREE ACTIVE on session create", async () => {
    const user = track(
      await createTestUser({
        plan: "PREMIUM",
        status: "ACTIVE",
        currentPeriodStart: new Date(Date.now() - 60 * 86400000),
        currentPeriodEnd: new Date(Date.now() - 1 * 86400000), // expired yesterday
        paymentProvider: "CASH",
      }),
    );

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ mode: "TEXT" });
    expect(res.status).toBe(201);

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    expect(sub?.plan).toBe("FREE");
    expect(sub?.status).toBe("ACTIVE");
    expect(sub?.currentPeriodEnd).toBeNull();
    expect(sub?.currentPeriodStart).toBeNull();
    expect(sub?.paymentProvider).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/sessions — list", () => {
  let user: TestUser;
  let voiceEndedId: string;

  beforeAll(async () => {
    user = track(await createTestUser());
    await makeSession(user.id, { mode: "TEXT", ended: false });
    const v = await makeSession(user.id, { mode: "VOICE", ended: true });
    voiceEndedId = v.id;
  });

  it("200 — returns only the caller's sessions with pagination meta", async () => {
    const res = await request(app)
      .get("/api/v1/sessions")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.meta.page).toBe(1);
  });

  it("200 — filters by ?mode=VOICE", async () => {
    const res = await request(app)
      .get("/api/v1/sessions?mode=VOICE")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(voiceEndedId);
    expect(res.body.data[0].mode).toBe("VOICE");
  });

  it("200 — ?active=true returns only not-ended sessions", async () => {
    const res = await request(app)
      .get("/api/v1/sessions?active=true")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].endedAt).toBeNull();
  });

  it("200 — ?active=false returns only ended sessions", async () => {
    const res = await request(app)
      .get("/api/v1/sessions?active=false")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].endedAt).not.toBeNull();
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/sessions");
    expect(res.status).toBe(401);
  });

  it("422 — limit over the max of 100", async () => {
    const res = await request(app)
      .get("/api/v1/sessions?limit=999")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/sessions/:id — detail", () => {
  let owner: TestUser;
  let other: TestUser;
  let sessionId: string;

  beforeAll(async () => {
    owner = track(await createTestUser());
    other = track(await createTestUser());
    const s = await makeSession(owner.id, { mode: "TEXT" });
    sessionId = s.id;
    await addEvaluatedMessage(sessionId, owner.id, {
      grammar: 80, vocab: 70, fluency: 75, overall: 76, words: 10,
    });
  });

  it("200 — returns the session with nested message evaluations", async () => {
    const res = await request(app)
      .get(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(sessionId);
    expect(res.body.data.messages).toHaveLength(1);
    expect(res.body.data.messages[0].evaluation.grammarScore).toBe(80);
    expect(res.body.data.evaluation).toBeNull(); // not ended yet
  });

  it("404 — another user cannot read this session", async () => {
    const res = await request(app)
      .get(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(res.status).toBe(404);
  });

  it("404 — nonexistent session id", async () => {
    const res = await request(app)
      .get(`/api/v1/sessions/${NONEXISTENT_ID}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.status).toBe(404);
  });

  it("422 — malformed (non-uuid) id", async () => {
    const res = await request(app)
      .get("/api/v1/sessions/not-a-uuid")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app).get(`/api/v1/sessions/${sessionId}`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/sessions/:id/end", () => {
  it("200 — aggregates message evaluations, writes progress + metrics", async () => {
    const user = track(await createTestUser({ plan: "FREE", status: "ACTIVE" }));
    const s = await makeSession(user.id, { mode: "TEXT" });
    await addEvaluatedMessage(s.id, user.id, { grammar: 80, vocab: 70, fluency: 75, overall: 76, words: 10 });
    await addEvaluatedMessage(s.id, user.id, { grammar: 90, vocab: 60, fluency: 85, overall: 84, words: 20 });

    const res = await request(app)
      .post(`/api/v1/sessions/${s.id}/end`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.endedAt).not.toBeNull();
    expect(typeof data.durationSeconds).toBe("number");
    expect(data.messageCount).toBe(2);

    // Session evaluation averages
    const e = data.evaluation;
    expect(e.avgGrammarScore).toBe(85);
    expect(e.avgVocabularyScore).toBe(65);
    expect(e.avgFluencyScore).toBe(80);
    expect(e.avgOverallScore).toBe(80);
    expect(e.avgPronunciationScore).toBeNull(); // text session
    expect(e.detectedCefrLevel).toBe("C1"); // 80 → C1
    expect(e.totalUserMessages).toBe(2);
    expect(e.totalUserWords).toBe(30);
    expect(e.strengths).toContain("Strong grammar skills");
    expect(e.strengths).toContain("Strong fluency skills");
    expect(e.weaknesses).toHaveLength(0);

    // Progress row for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const progress = await prisma.progress.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });
    expect(progress?.sessionsCount).toBe(1);
    expect(progress?.messagesCount).toBe(2);
    expect(progress?.wordsTyped).toBe(30);
    expect(progress?.studyMinutes).toBeGreaterThanOrEqual(1);

    // Lifetime metrics (fresh user → skills start at 0, streak starts at 1)
    const metrics = await prisma.userMetrics.findUnique({ where: { userId: user.id } });
    expect(metrics?.currentStreak).toBe(1);
    expect(metrics?.longestStreak).toBe(1);
    expect(metrics?.estimatedLevel).toBe("C1");
    expect(metrics?.totalWordsTyped).toBe(30);
    expect(metrics?.grammarSkill).toBe(ema(0, 85));
    expect(metrics?.vocabularySkill).toBe(ema(0, 65));
    expect(metrics?.fluencySkill).toBe(ema(0, 80));
  });

  it("200 — session with no evaluated messages still updates progress, no evaluation", async () => {
    const user = track(await createTestUser());
    const s = await makeSession(user.id, { mode: "TEXT" });

    const res = await request(app)
      .post(`/api/v1/sessions/${s.id}/end`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.endedAt).not.toBeNull();
    expect(res.body.data.evaluation).toBeNull();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const progress = await prisma.progress.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });
    expect(progress?.sessionsCount).toBe(1);
    expect(progress?.messagesCount).toBe(0);
  });

  it("200 — crossing a 7-day streak fires a STREAK_MILESTONE notification", async () => {
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);

    const user = track(
      await createTestUser({
        metrics: { currentStreak: 6, longestStreak: 6, lastStudyDate: yesterday },
      }),
    );
    const s = await makeSession(user.id, { mode: "TEXT" });

    const res = await request(app)
      .post(`/api/v1/sessions/${s.id}/end`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);

    const metrics = await prisma.userMetrics.findUnique({ where: { userId: user.id } });
    expect(metrics?.currentStreak).toBe(7);

    const notif = await prisma.notification.findFirst({
      where: { userId: user.id, type: "STREAK_MILESTONE" },
    });
    expect(notif).not.toBeNull();
  });

  it("409 — ending an already-ended session", async () => {
    const user = track(await createTestUser());
    const s = await makeSession(user.id, { mode: "TEXT" });
    const first = await request(app)
      .post(`/api/v1/sessions/${s.id}/end`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/v1/sessions/${s.id}/end`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/already ended/i);
  });

  it("404 — another user cannot end this session", async () => {
    const owner = track(await createTestUser());
    const other = track(await createTestUser());
    const s = await makeSession(owner.id, { mode: "TEXT" });
    const res = await request(app)
      .post(`/api/v1/sessions/${s.id}/end`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(res.status).toBe(404);
  });

  it("404 — nonexistent session id", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .post(`/api/v1/sessions/${NONEXISTENT_ID}/end`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(404);
  });

  it("422 — malformed id", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .post("/api/v1/sessions/not-a-uuid/end")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app).post(`/api/v1/sessions/${NONEXISTENT_ID}/end`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/sessions/stats", () => {
  it("200 — own stats with a zero-filled 30-day window by default", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .get("/api/v1/sessions/stats")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.days).toBe(30);
    expect(res.body.data.dailyStats).toHaveLength(30);
    expect(typeof res.body.data.totalSessions).toBe("number");
  });

  it("200 — respects ?days=7", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .get("/api/v1/sessions/stats?days=7")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.days).toBe(7);
    expect(res.body.data.dailyStats).toHaveLength(7);
  });

  it("422 — days over the max of 90", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .get("/api/v1/sessions/stats?days=100")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(422);
  });

  it("422 — non-numeric days", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .get("/api/v1/sessions/stats?days=abc")
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app).get("/api/v1/sessions/stats");
    expect(res.status).toBe(401);
  });

  it("403 — a student cannot view another user's stats", async () => {
    const ali = await login(SEED.ali);
    const yuki = await login(SEED.yuki);
    const res = await request(app)
      .get(`/api/v1/sessions/stats?userId=${yuki.user.id}`)
      .set("Authorization", `Bearer ${ali.accessToken}`);
    expect(res.status).toBe(403);
  });

  it("200 — an admin can view any user's stats", async () => {
    const admin = await login(SEED.admin);
    const ali = await login(SEED.ali);
    const res = await request(app)
      .get(`/api/v1/sessions/stats?userId=${ali.user.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(200);
  });

  it("200 — a tutor can view a student in their class", async () => {
    const tutor = await login(SEED.tutor);
    const ali = await login(SEED.ali); // enrolled in Sarah's class
    const res = await request(app)
      .get(`/api/v1/sessions/stats?userId=${ali.user.id}`)
      .set("Authorization", `Bearer ${tutor.accessToken}`);
    expect(res.status).toBe(200);
  });

  it("404 — a tutor cannot view a student not in their class", async () => {
    const tutor = await login(SEED.tutor);
    const outsider = track(await createTestUser());
    const res = await request(app)
      .get(`/api/v1/sessions/stats?userId=${outsider.id}`)
      .set("Authorization", `Bearer ${tutor.accessToken}`);
    expect(res.status).toBe(404);
  });

  it("401 — expired and wrong-secret tokens are rejected", async () => {
    const expired = await request(app)
      .get("/api/v1/sessions/stats")
      .set("Authorization", `Bearer ${expiredToken()}`);
    expect(expired.status).toBe(401);

    const wrong = await request(app)
      .get("/api/v1/sessions/stats")
      .set("Authorization", `Bearer ${wrongSecretToken()}`);
    expect(wrong.status).toBe(401);
  });
});
