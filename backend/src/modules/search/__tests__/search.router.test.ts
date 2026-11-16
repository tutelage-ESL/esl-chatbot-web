import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import {
  app,
  request,
  prisma,
  createTestUser,
  deleteTestUsers,
  uniqueId,
  type TestUser,
} from "../../../test/helpers.ts";
import { generateClassCode } from "../../classes/classCode.util.ts";

// ───────────────────────────────────────────────────────────────────────────
// Global search — GET /api/v1/search?q=
//
// Scoping rules (search.service.ts):
//   users       — ADMIN only; internal (stealth) accounts never surface
//   classes     — ADMIN: every non-archived class; others: only classes they belong to
//   vocabulary / goals / sessions — always the caller's own rows only
//
// Every fixture embeds one random token so assertions are independent of seed data.
// ───────────────────────────────────────────────────────────────────────────

const TOKEN = `zq${uniqueId()}`;
const createdUserIds: string[] = [];
const createdClassIds: string[] = [];
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let admin: TestUser;
let tutor: TestUser;
let student: TestUser;
let otherStudent: TestUser;
let memberClassId: string;
let otherClassId: string;
let archivedClassId: string;

async function makeClass(name: string, creatorId: string, opts: { archived?: boolean } = {}) {
  const cls = await prisma.class.create({
    data: { className: name, classCode: generateClassCode(), createdById: creatorId, archived: opts.archived ?? false },
    select: { id: true },
  });
  createdClassIds.push(cls.id);
  return cls.id;
}

beforeAll(async () => {
  admin = await createTestUser({ role: "ADMIN" });
  tutor = await createTestUser({ role: "TUTOR" });
  student = await createTestUser({ role: "STUDENT" });
  otherStudent = await createTestUser({ role: "STUDENT" });
  const stealth = await createTestUser({ role: "STUDENT", isInternal: true });
  createdUserIds.push(admin.id, tutor.id, student.id, otherStudent.id, stealth.id);

  // Users whose display names carry the token (one of them stealth).
  await prisma.user.update({ where: { id: student.id }, data: { displayName: `Student ${TOKEN}` } });
  await prisma.user.update({ where: { id: stealth.id }, data: { displayName: `Hidden ${TOKEN}` } });

  memberClassId = await makeClass(`Member ${TOKEN}`, tutor.id);
  otherClassId = await makeClass(`Other ${TOKEN}`, tutor.id);
  archivedClassId = await makeClass(`Archived ${TOKEN}`, tutor.id, { archived: true });
  await prisma.classUser.createMany({
    data: [
      { classId: memberClassId, userId: student.id, role: "STUDENT" },
      { classId: archivedClassId, userId: student.id, role: "STUDENT" },
    ],
  });

  for (const owner of [student, otherStudent]) {
    await prisma.vocabulary.create({ data: { userId: owner.id, word: `${TOKEN}word`, definition: "test word" } });
    await prisma.goal.create({ data: { userId: owner.id, type: "VOCABULARY", description: `Goal ${TOKEN}`, target: 10 } });
    await prisma.conversationSession.create({ data: { userId: owner.id, topic: `Topic ${TOKEN}` } });
  }
});

afterAll(async () => {
  await prisma.class.deleteMany({ where: { id: { in: createdClassIds } } });
  await deleteTestUsers(createdUserIds);
  await prisma.$disconnect();
});

const search = (user: TestUser, q = TOKEN) => request(app).get(`/api/v1/search?q=${encodeURIComponent(q)}`).set(auth(user.token));

describe("GET /api/v1/search", () => {
  it("401 — no token", async () => {
    const res = await request(app).get(`/api/v1/search?q=${TOKEN}`);
    expect(res.status).toBe(401);
  });

  it.each([
    ["", "missing"],
    ["a", "one character"],
    [" a ", "one character after trimming"],
    ["x".repeat(101), "over 100 characters"],
  ])("422 — q %s", async (q) => {
    const res = await search(student, q);
    expect(res.status).toBe(422);
  });

  it("200 — returns the envelope with the query and a matching total", async () => {
    const res = await search(student);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { query, total, results } = res.body.data;
    expect(query).toBe(TOKEN);
    const counted = Object.values(results as Record<string, unknown[]>).reduce((n, list) => n + list.length, 0);
    expect(total).toBe(counted);
  });

  it("student — never sees users; sees only their own classes (not archived)", async () => {
    const { results } = (await search(student)).body.data;
    expect(results.users).toEqual([]);
    expect(results.classes.map((c: { id: string }) => c.id)).toEqual([memberClassId]);
  });

  it("student — vocabulary, goals and sessions are their own only", async () => {
    const { results } = (await search(student)).body.data;
    const ownVocab = await prisma.vocabulary.findMany({ where: { userId: student.id, word: { contains: TOKEN } }, select: { id: true } });
    expect(results.vocabulary.map((v: { id: string }) => v.id)).toEqual(ownVocab.map((v) => v.id));
    expect(results.goals).toHaveLength(1);
    expect(results.sessions).toHaveLength(1);
  });

  it("matching is case-insensitive", async () => {
    const { results } = (await search(student, TOKEN.toUpperCase())).body.data;
    expect(results.goals).toHaveLength(1);
  });

  it("tutor — sees no users and no classes they are not a member of", async () => {
    const { results } = (await search(tutor)).body.data;
    expect(results.users).toEqual([]);
    // The tutor created the classes but has no ClassUser row in them here.
    expect(results.classes).toEqual([]);
  });

  it("admin — sees matching users but never internal accounts", async () => {
    const { results } = (await search(admin)).body.data;
    const ids = results.users.map((u: { id: string }) => u.id);
    expect(ids).toContain(student.id);
    expect(results.users.every((u: { displayName: string }) => !u.displayName.startsWith("Hidden"))).toBe(true);
    expect(results.users[0]).not.toHaveProperty("password");
  });

  it("admin — sees every non-archived class", async () => {
    const { results } = (await search(admin)).body.data;
    const ids = results.classes.map((c: { id: string }) => c.id).sort();
    expect(ids).toEqual([memberClassId, otherClassId].sort());
    expect(ids).not.toContain(archivedClassId);
  });
});
