import { describe, it, expect, afterAll } from "bun:test";
import {
  app,
  request,
  prisma,
  expiredToken,
  wrongSecretToken,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../../test/helpers.ts";

// ───────────────────────────────────────────────────────────────────────────
// Phase 3 — Messages (POST/GET /api/v1/sessions/:sessionId/messages)
//
// The messages router is mounted under /sessions, so paths are
//   POST /api/v1/sessions/:sessionId/messages
//   GET  /api/v1/sessions/:sessionId/messages
//
// The AI layer is mocked in src/test/setup.ts: generateAIResponse returns a
// fixed reply + evaluation (grammar 80 / vocab 70 / fluency 75 / overall 76 /
// CEFR B1) and records the history length it received on globalThis
// (__aiContextLength) so the FREE-vs-default context window can be asserted.
//
// Every test uses a fresh createTestUser() (deleted in afterAll, cascade), so the
// shared seed users are never touched. Message-limit tests pre-insert rows via
// createMany rather than driving 30 real POSTs.
// ───────────────────────────────────────────────────────────────────────────

// Valid v4 UUID that will never exist → service lookup returns 404 (not Zod 422).
const NONEXISTENT_ID = "00000000-0000-4000-8000-000000000000";
const createdUserIds: string[] = [];

function track(u: TestUser): TestUser {
  createdUserIds.push(u.id);
  return u;
}

/** Creates a raw conversation session row for a user. */
async function makeSession(userId: string, opts: { ended?: boolean } = {}) {
  return prisma.conversationSession.create({
    data: {
      userId,
      mode: "TEXT",
      ...(opts.ended ? { endedAt: new Date(), durationSeconds: 600 } : {}),
    },
    select: { id: true },
  });
}

/** Bulk-inserts plain messages (no evaluations) to pad session/day counts fast. */
async function fillMessages(
  sessionId: string,
  userId: string,
  counts: { user?: number; assistant?: number },
) {
  const rows: {
    userId: string;
    sessionId: string;
    role: "USER" | "ASSISTANT";
    type: "TEXT";
    content: string;
    wordCount: number;
  }[] = [];
  for (let i = 0; i < (counts.user ?? 0); i++)
    rows.push({ userId, sessionId, role: "USER", type: "TEXT", content: `u${i}`, wordCount: 1 });
  for (let i = 0; i < (counts.assistant ?? 0); i++)
    rows.push({ userId, sessionId, role: "ASSISTANT", type: "TEXT", content: `a${i}`, wordCount: 1 });
  if (rows.length) await prisma.message.createMany({ data: rows });
}

/** Inserts one USER message with an evaluation (for the list endpoint). */
async function addEvaluatedMessage(sessionId: string, userId: string, content: string) {
  const msg = await prisma.message.create({
    data: { userId, sessionId, role: "USER", type: "TEXT", content, wordCount: 2 },
    select: { id: true },
  });
  await prisma.messageEvaluation.create({
    data: {
      messageId: msg.id,
      grammarScore: 88,
      grammarErrors: [],
      vocabularyScore: 72,
      vocabularyLevel: "B1",
      fluencyScore: 80,
      overallScore: 81,
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
describe("POST /api/v1/sessions/:sessionId/messages — send", () => {
  it("201 — stores user message, AI reply, and evaluation; bumps session messageCount", async () => {
    const user = track(await createTestUser({ plan: "FREE", status: "ACTIVE" }));
    const session = await makeSession(user.id);

    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "Hello there friend" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const { userMessage, assistantMessage, evaluation } = res.body.data;
    expect(userMessage.role).toBe("USER");
    expect(userMessage.content).toBe("Hello there friend");
    expect(userMessage.wordCount).toBe(3);
    expect(assistantMessage.role).toBe("ASSISTANT");
    expect(assistantMessage.content).toMatch(/mock AI/i);

    expect(evaluation.grammarScore).toBe(80);
    expect(evaluation.vocabularyScore).toBe(70);
    expect(evaluation.fluencyScore).toBe(75);
    expect(evaluation.overallScore).toBe(76);
    expect(evaluation.detectedCefrLevel).toBe("B1");

    // user + assistant message both stored → session.messageCount === 2
    const fresh = await prisma.conversationSession.findUnique({
      where: { id: session.id },
      select: { messageCount: true },
    });
    expect(fresh?.messageCount).toBe(2);
  });

  it("201 — defaults message type to TEXT when omitted", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id);
    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "no type field here" });
    expect(res.status).toBe(201);
    expect(res.body.data.userMessage.type).toBe("TEXT");
  });

  it("401 — no token", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id);
    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .send({ content: "hi" });
    expect(res.status).toBe(401);
  });

  it("404 — another user cannot post to this session", async () => {
    const owner = track(await createTestUser());
    const other = track(await createTestUser());
    const session = await makeSession(owner.id);
    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ content: "sneaky" });
    expect(res.status).toBe(404);
  });

  it("404 — nonexistent session id", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .post(`/api/v1/sessions/${NONEXISTENT_ID}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "into the void" });
    expect(res.status).toBe(404);
  });

  it("409 — cannot post to an already-ended session", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id, { ended: true });
    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "too late" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ended session/i);
  });

  it("422 — empty content", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id);
    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it("422 — content exceeds 5000 chars", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id);
    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "a".repeat(5001) });
    expect(res.status).toBe(422);
  });

  it("422 — invalid message type", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id);
    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "hi", type: "AUDIO" });
    expect(res.status).toBe(422);
  });

  it("422 — malformed (non-uuid) session id", async () => {
    const user = track(await createTestUser());
    const res = await request(app)
      .post(`/api/v1/sessions/not-a-uuid/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "hi" });
    expect(res.status).toBe(422);
  });

  it("429 — FREE per-session hard cap (soft 20 + buffer 10 = 30 user messages)", async () => {
    const user = track(await createTestUser({ plan: "FREE", status: "ACTIVE" }));
    const session = await makeSession(user.id);
    await fillMessages(session.id, user.id, { user: 30 });

    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "one over the line" });

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/session message limit/i);
  });

  it("429 — FREE daily message cap (20/day across sessions) fires below the session cap", async () => {
    const user = track(await createTestUser({ plan: "FREE", status: "ACTIVE" }));
    const session = await makeSession(user.id);
    // 20 user messages: under the 30 session cap, but at the 20/day cap.
    await fillMessages(session.id, user.id, { user: 20 });

    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "twenty-first message today" });

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/daily message limit/i);
  });

  it("context window — FREE plan truncates AI history to 10 messages", async () => {
    const user = track(await createTestUser({ plan: "FREE", status: "ACTIVE" }));
    const session = await makeSession(user.id);
    // 25 total in the session (5 user keeps us under the 20/day cap), > both windows.
    await fillMessages(session.id, user.id, { user: 5, assistant: 20 });

    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "what context did the model get" });

    expect(res.status).toBe(201);
    expect((globalThis as Record<string, unknown>).__aiContextLength).toBe(10);
  });

  it("context window — PREMIUM plan sends up to 20 messages of AI history", async () => {
    const user = track(await createTestUser({ plan: "PREMIUM", status: "ACTIVE" }));
    const session = await makeSession(user.id);
    await fillMessages(session.id, user.id, { user: 5, assistant: 20 });

    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ content: "premium gets a wider window" });

    expect(res.status).toBe(201);
    expect((globalThis as Record<string, unknown>).__aiContextLength).toBe(20);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/sessions/:sessionId/messages — list", () => {
  it("200 — returns ordered messages with nested evaluations and pagination meta", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id);
    await addEvaluatedMessage(session.id, user.id, "first message");
    await addEvaluatedMessage(session.id, user.id, "second message");

    const res = await request(app)
      .get(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].content).toBe("first message"); // ascending order
    expect(res.body.data[0].evaluation.grammarScore).toBe(88);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.meta.page).toBe(1);
  });

  it("200 — respects ?page and ?limit", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id);
    await fillMessages(session.id, user.id, { user: 3 });

    const res = await request(app)
      .get(`/api/v1/sessions/${session.id}/messages?page=2&limit=2`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1); // 3 total, page 2 of size 2 → 1 row
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.totalPages).toBe(2);
  });

  it("401 — no token", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id);
    const res = await request(app).get(`/api/v1/sessions/${session.id}/messages`);
    expect(res.status).toBe(401);
  });

  it("404 — another user cannot list this session's messages", async () => {
    const owner = track(await createTestUser());
    const other = track(await createTestUser());
    const session = await makeSession(owner.id);
    const res = await request(app)
      .get(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(res.status).toBe(404);
  });

  it("422 — limit over the max of 100", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id);
    const res = await request(app)
      .get(`/api/v1/sessions/${session.id}/messages?limit=999`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(422);
  });

  it("401 — expired and wrong-secret tokens are rejected", async () => {
    const user = track(await createTestUser());
    const session = await makeSession(user.id);
    const a = await request(app)
      .get(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${expiredToken()}`);
    const b = await request(app)
      .get(`/api/v1/sessions/${session.id}/messages`)
      .set("Authorization", `Bearer ${wrongSecretToken()}`);
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
  });
});
