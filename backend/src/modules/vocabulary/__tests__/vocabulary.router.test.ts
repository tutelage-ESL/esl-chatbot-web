import { describe, it, expect, afterAll } from "bun:test";
import {
  app,
  request,
  prisma,
  createTestUser,
  deleteTestUsers,
  uniqueId,
  type TestUser,
} from "../../../test/helpers.ts";

// ───────────────────────────────────────────────────────────────────────────
// Phase 5a — Vocabulary (CRUD + SM-2 SRS review)
//
// SM-2 (vocabulary.service.ts):
//   ease' = clamp(prevEase + 0.1 - (5-q)*(0.08 + (5-q)*0.02), 1.3, 2.5)
//   interval: q<3 → 1 · reviewCount 0 → 1 · reviewCount 1 → 6 · else round(prevInterval*prevEase)
//   masteryLevel(interval): ≤1→1, ≤3→2, ≤7→3, ≤21→4, else 5
// Review also increments today's progress.vocabularyPracticed.
// ───────────────────────────────────────────────────────────────────────────

const NONEXISTENT_ID = "00000000-0000-4000-8000-000000000000";
const createdUserIds: string[] = [];
const user = (u: TestUser) => (createdUserIds.push(u.id), u);
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

interface VocabOpts {
  word?: string;
  source?: "MANUAL" | "SESSION";
  srsDue?: Date;
  srsInterval?: number;
  srsEase?: number;
  reviewCount?: number;
}
async function makeVocab(userId: string, opts: VocabOpts = {}) {
  return prisma.vocabulary.create({
    data: {
      userId,
      word: opts.word ?? `w${uniqueId()}`,
      definition: "a test definition",
      source: opts.source ?? "MANUAL",
      ...(opts.srsDue !== undefined && { srsDue: opts.srsDue }),
      ...(opts.srsInterval !== undefined && { srsInterval: opts.srsInterval }),
      ...(opts.srsEase !== undefined && { srsEase: opts.srsEase }),
      ...(opts.reviewCount !== undefined && { reviewCount: opts.reviewCount }),
    },
    select: { id: true, word: true },
  });
}

afterAll(async () => {
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/vocabulary — add", () => {
  it("201 — adds a word, stored lowercase, source MANUAL", async () => {
    const u = user(await createTestUser());
    const res = await request(app)
      .post("/api/v1/vocabulary")
      .set(auth(u.token))
      .send({ word: "Serendipity", definition: "luck in finding good things" });
    expect(res.status).toBe(201);
    expect(res.body.data.word).toBe("serendipity");
    expect(res.body.data.source).toBe("MANUAL");
  });

  it("409 — duplicate word (case-insensitive, stored lowercase)", async () => {
    const u = user(await createTestUser());
    await request(app)
      .post("/api/v1/vocabulary")
      .set(auth(u.token))
      .send({ word: "hello", definition: "a greeting" });
    const dup = await request(app)
      .post("/api/v1/vocabulary")
      .set(auth(u.token))
      .send({ word: "Hello", definition: "the same word capitalised" });
    expect(dup.status).toBe(409);
  });

  it("422 — missing definition", async () => {
    const u = user(await createTestUser());
    const res = await request(app)
      .post("/api/v1/vocabulary")
      .set(auth(u.token))
      .send({ word: "lonely" });
    expect(res.status).toBe(422);
  });

  it("401 — no token", async () => {
    const res = await request(app).post("/api/v1/vocabulary").send({ word: "x", definition: "y" });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/vocabulary — list & filters", () => {
  it("200 — lists the caller's words with pagination meta", async () => {
    const u = user(await createTestUser());
    await makeVocab(u.id);
    await makeVocab(u.id);
    const res = await request(app).get("/api/v1/vocabulary").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(2);
  });

  it("200 — ?source=MANUAL excludes SESSION words", async () => {
    const u = user(await createTestUser());
    await makeVocab(u.id, { source: "MANUAL" });
    await makeVocab(u.id, { source: "SESSION" });
    const res = await request(app)
      .get("/api/v1/vocabulary?source=MANUAL")
      .set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.every((v: { source: string }) => v.source === "MANUAL")).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it("200 — ?due=true returns only cards due now", async () => {
    const u = user(await createTestUser());
    await makeVocab(u.id, { srsDue: new Date(Date.now() - 86400000) }); // overdue
    await makeVocab(u.id, { srsDue: new Date(Date.now() + 86400000) }); // not due
    const res = await request(app).get("/api/v1/vocabulary?due=true").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("422 — limit over the max of 100", async () => {
    const u = user(await createTestUser());
    const res = await request(app).get("/api/v1/vocabulary?limit=999").set(auth(u.token));
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/vocabulary/due & /stats", () => {
  it("200 — /due returns only due cards", async () => {
    const u = user(await createTestUser());
    await makeVocab(u.id, { srsDue: new Date(Date.now() - 1000) });
    await makeVocab(u.id, { srsDue: new Date(Date.now() + 86400000) });
    const res = await request(app).get("/api/v1/vocabulary/due").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("200 — /stats summarises totals and mastery breakdown", async () => {
    const u = user(await createTestUser());
    await makeVocab(u.id, { srsDue: new Date(Date.now() - 1000) });
    await makeVocab(u.id);
    const res = await request(app).get("/api/v1/vocabulary/stats").set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.dueToday).toBeGreaterThanOrEqual(1);
    expect(res.body.data.byMasteryLevel).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("GET/PATCH/DELETE /api/v1/vocabulary/:id", () => {
  it("200 — get own item", async () => {
    const u = user(await createTestUser());
    const v = await makeVocab(u.id);
    const res = await request(app).get(`/api/v1/vocabulary/${v.id}`).set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(v.id);
  });

  it("404 — another user cannot read this item", async () => {
    const owner = user(await createTestUser());
    const other = user(await createTestUser());
    const v = await makeVocab(owner.id);
    const res = await request(app).get(`/api/v1/vocabulary/${v.id}`).set(auth(other.token));
    expect(res.status).toBe(404);
  });

  it("422 — non-uuid id", async () => {
    const u = user(await createTestUser());
    const res = await request(app).get(`/api/v1/vocabulary/not-a-uuid`).set(auth(u.token));
    expect(res.status).toBe(422);
  });

  it("200 — update definition", async () => {
    const u = user(await createTestUser());
    const v = await makeVocab(u.id);
    const res = await request(app)
      .patch(`/api/v1/vocabulary/${v.id}`)
      .set(auth(u.token))
      .send({ definition: "an updated definition" });
    expect(res.status).toBe(200);
    expect(res.body.data.definition).toBe("an updated definition");
  });

  it("422 — empty update body", async () => {
    const u = user(await createTestUser());
    const v = await makeVocab(u.id);
    const res = await request(app).patch(`/api/v1/vocabulary/${v.id}`).set(auth(u.token)).send({});
    expect(res.status).toBe(422);
  });

  it("404 — cannot update another user's item", async () => {
    const owner = user(await createTestUser());
    const other = user(await createTestUser());
    const v = await makeVocab(owner.id);
    const res = await request(app)
      .patch(`/api/v1/vocabulary/${v.id}`)
      .set(auth(other.token))
      .send({ definition: "hijack" });
    expect(res.status).toBe(404);
  });

  it("200 — delete own item", async () => {
    const u = user(await createTestUser());
    const v = await makeVocab(u.id);
    const res = await request(app).delete(`/api/v1/vocabulary/${v.id}`).set(auth(u.token));
    expect(res.status).toBe(200);
    expect(await prisma.vocabulary.findUnique({ where: { id: v.id } })).toBeNull();
  });

  it("404 — cannot delete another user's item", async () => {
    const owner = user(await createTestUser());
    const other = user(await createTestUser());
    const v = await makeVocab(owner.id);
    const res = await request(app).delete(`/api/v1/vocabulary/${v.id}`).set(auth(other.token));
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/vocabulary/:id/review — SM-2", () => {
  it("200 — first review (reviewCount 0), quality 5 → interval 1, mastery 1, ease clamped to 2.5", async () => {
    const u = user(await createTestUser());
    const v = await makeVocab(u.id, { srsInterval: 1, srsEase: 2.5, reviewCount: 0 });
    const res = await request(app)
      .post(`/api/v1/vocabulary/${v.id}/review`)
      .set(auth(u.token))
      .send({ quality: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.srsInterval).toBe(1);
    expect(res.body.data.masteryLevel).toBe(1);
    expect(res.body.data.reviewCount).toBe(1);
    expect(res.body.data.correctCount).toBe(1);
    expect(res.body.data.srsEase).toBeCloseTo(2.5, 5); // 2.6 clamped to 2.5
    expect(new Date(res.body.data.srsDue).getTime()).toBeGreaterThan(Date.now());
  });

  it("200 — second review (reviewCount 1), quality 4 → interval 6, mastery 3", async () => {
    const u = user(await createTestUser());
    const v = await makeVocab(u.id, { srsInterval: 1, srsEase: 2.5, reviewCount: 1 });
    const res = await request(app)
      .post(`/api/v1/vocabulary/${v.id}/review`)
      .set(auth(u.token))
      .send({ quality: 4 });
    expect(res.status).toBe(200);
    expect(res.body.data.srsInterval).toBe(6);
    expect(res.body.data.masteryLevel).toBe(3);
  });

  it("200 — mature review (reviewCount 2), quality 5 → interval round(6*2.5)=15, mastery 4", async () => {
    const u = user(await createTestUser());
    const v = await makeVocab(u.id, { srsInterval: 6, srsEase: 2.5, reviewCount: 2 });
    const res = await request(app)
      .post(`/api/v1/vocabulary/${v.id}/review`)
      .set(auth(u.token))
      .send({ quality: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.srsInterval).toBe(15);
    expect(res.body.data.masteryLevel).toBe(4);
  });

  it("200 — wrong answer (quality 1) → interval resets to 1, incorrectCount up, ease drops", async () => {
    const u = user(await createTestUser());
    const v = await makeVocab(u.id, { srsInterval: 6, srsEase: 2.5, reviewCount: 2 });
    const res = await request(app)
      .post(`/api/v1/vocabulary/${v.id}/review`)
      .set(auth(u.token))
      .send({ quality: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.srsInterval).toBe(1);
    expect(res.body.data.incorrectCount).toBe(1);
    expect(res.body.data.srsEase).toBeCloseTo(1.96, 5); // 2.5 + 0.1 - 4*(0.08+0.08)
  });

  it("200 — review increments today's progress.vocabularyPracticed", async () => {
    const u = user(await createTestUser());
    const v = await makeVocab(u.id);
    await request(app).post(`/api/v1/vocabulary/${v.id}/review`).set(auth(u.token)).send({ quality: 4 });
    const today = await request(app).get("/api/v1/progress/today").set(auth(u.token));
    expect(today.status).toBe(200);
    expect(today.body.data.vocabularyPracticed).toBe(1);
  });

  it("404 — cannot review another user's card", async () => {
    const owner = user(await createTestUser());
    const other = user(await createTestUser());
    const v = await makeVocab(owner.id);
    const res = await request(app)
      .post(`/api/v1/vocabulary/${v.id}/review`)
      .set(auth(other.token))
      .send({ quality: 4 });
    expect(res.status).toBe(404);
  });

  it("422 — quality out of range", async () => {
    const u = user(await createTestUser());
    const v = await makeVocab(u.id);
    const res = await request(app)
      .post(`/api/v1/vocabulary/${v.id}/review`)
      .set(auth(u.token))
      .send({ quality: 6 });
    expect(res.status).toBe(422);
  });
});
