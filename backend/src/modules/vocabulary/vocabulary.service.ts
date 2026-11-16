import type { Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import { deleteCache, cacheKeys } from "../../config/cache.ts";
import { createNotification } from "../notifications/notifications.service.ts";
import type { VocabularyItem, VocabularyStats, ReviewResult } from "./vocabulary.types.ts";
import type { NewVocabularyWord } from "../ai/ai.types.ts";
import type {
  addVocabularySchema,
  updateVocabularySchema,
  listVocabularyQuerySchema,
} from "./vocabulary.schema.ts";
import type { z } from "zod";

const VOCAB_SELECT = {
  id: true,
  userId: true,
  word: true,
  definition: true,
  pronunciation: true,
  example: true,
  partOfSpeech: true,
  difficulty: true,
  category: true,
  source: true,
  srsInterval: true,
  srsDue: true,
  srsEase: true,
  reviewCount: true,
  correctCount: true,
  incorrectCount: true,
  masteryLevel: true,
  lastPracticed: true,
  assignedByTutorId: true,
  assignedByTutor: {
    select: { id: true, displayName: true, role: true },
  },
  createdAt: true,
  updatedAt: true,
} as const;

// ── SM-2 algorithm ────────────────────────────────────────────
// quality 0-5: 0-2 = wrong, 3-5 = correct.
// Updates ease factor, interval, and derives masteryLevel from interval.

function computeMasteryLevel(interval: number): number {
  if (interval <= 1) return 1;
  if (interval <= 3) return 2;
  if (interval <= 7) return 3;
  if (interval <= 21) return 4;
  return 5;
}

function sm2(
  quality: number,
  prevInterval: number,
  prevEase: number,
  reviewCount: number,
): { interval: number; ease: number } {
  let ease = prevEase + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  ease = Math.max(1.3, Math.min(2.5, ease));

  let interval: number;
  if (quality < 3) {
    interval = 1;
  } else if (reviewCount === 0) {
    interval = 1;
  } else if (reviewCount === 1) {
    interval = 6;
  } else {
    interval = Math.max(1, Math.round(prevInterval * prevEase));
  }

  return { interval, ease };
}

// ── Upsert session vocabulary ─────────────────────────────
// Called by sessions.service at endSession() to bulk-insert AI-detected words.
// Validates + deduplicates before writing. skipDuplicates preserves existing SRS state.

export async function upsertSessionVocabulary(
  userId: string,
  rawWords: NewVocabularyWord[],
): Promise<NewVocabularyWord[]> {
  if (rawWords.length === 0) return [];

  const seen = new Set<string>();
  const valid: NewVocabularyWord[] = [];

  for (const w of rawWords) {
    const word = w.word?.toLowerCase()?.trim();
    if (!word || word.length > 50 || !/^[a-zA-Z\s'-]+$/.test(word)) continue;
    if (!w.definition?.trim()) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    valid.push({
      word,
      definition: w.definition.trim(),
      partOfSpeech: w.partOfSpeech?.trim() || undefined,
      example: w.example?.trim() || undefined,
    });
    if (valid.length >= 20) break; // safety cap per session
  }

  if (valid.length === 0) return [];

  await prisma.vocabulary.createMany({
    data: valid.map((w) => ({
      userId,
      word: w.word,
      definition: w.definition,
      partOfSpeech: w.partOfSpeech ?? null,
      example: w.example ?? null,
      source: "SESSION" as const,
    })),
    skipDuplicates: true,
  });

  return valid;
}

// ── Vocabulary stats ──────────────────────────────────────────

export async function getVocabularyStats(userId: string): Promise<VocabularyStats> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, dueToday, learnedThisWeek, byLevel] = await Promise.all([
    prisma.vocabulary.count({ where: { userId } }),
    prisma.vocabulary.count({ where: { userId, srsDue: { lte: now } } }),
    prisma.vocabulary.count({ where: { userId, createdAt: { gte: weekAgo } } }),
    prisma.vocabulary.groupBy({
      by: ["masteryLevel"],
      where: { userId },
      _count: { _all: true },
    }),
  ]);

  const levelMap = new Map(byLevel.map((r) => [r.masteryLevel, (r._count as { _all: number })._all]));

  return {
    total,
    dueToday,
    learnedThisWeek,
    byMasteryLevel: {
      new: levelMap.get(0) ?? 0,
      seen: levelMap.get(1) ?? 0,
      learning: levelMap.get(2) ?? 0,
      familiar: levelMap.get(3) ?? 0,
      proficient: levelMap.get(4) ?? 0,
      mastered: levelMap.get(5) ?? 0,
    },
  };
}

// ── List vocabulary ───────────────────────────────────────────

export async function listVocabulary(
  userId: string,
  query: z.infer<typeof listVocabularyQuerySchema>,
): Promise<{ items: VocabularyItem[]; total: number }> {
  const where: Prisma.VocabularyWhereInput = { userId };

  if (query.due === "true") where.srsDue = { lte: new Date() };
  if (query.due === "false") where.srsDue = { gt: new Date() };
  if (query.source) where.source = query.source;
  if (query.category) where.category = { contains: query.category, mode: "insensitive" };
  if (query.search) {
    where.OR = [
      { word: { contains: query.search, mode: "insensitive" } },
      { definition: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.vocabulary.findMany({
      where,
      select: VOCAB_SELECT,
      orderBy: { srsDue: "asc" },
      skip,
      take: query.limit,
    }),
    prisma.vocabulary.count({ where }),
  ]);

  return { items, total };
}

// ── Get due cards for SRS review ──────────────────────────────

export async function getDueCards(userId: string): Promise<VocabularyItem[]> {
  const items = await prisma.vocabulary.findMany({
    where: { userId, srsDue: { lte: new Date() } },
    select: VOCAB_SELECT,
    orderBy: { srsDue: "asc" },
    take: 50,
  });
  return items;
}

// ── Add word ──────────────────────────────────────────────────

/**
 * Add a word to a vocabulary list.
 *
 * Self-add (no `assignedToUserId`): the caller adds to their own list as `MANUAL`.
 *
 * Assign (`assignedToUserId` set, caller is TUTOR/ADMIN): the word is added to the
 * target student's list as `ASSIGNED` with `assignedByTutorId` set to the caller, and
 * a `VOCABULARY_ASSIGNED` notification is fired. Mirrors the goal-assignment guard:
 *  - STUDENT callers cannot assign (403)
 *  - TUTOR callers must share a class with the student as TUTOR (404 otherwise)
 *  - ADMIN callers are unrestricted
 */
export async function addVocabulary(
  callerId: string,
  callerRole: Role,
  input: z.infer<typeof addVocabularySchema>,
): Promise<VocabularyItem> {
  // Resolve target user and source/assignment metadata
  const userId = input.assignedToUserId ?? callerId;
  const source = input.assignedToUserId ? "ASSIGNED" as const : "MANUAL" as const;

  if (input.assignedToUserId) {
    // Students cannot assign vocabulary to others
    if (callerRole === "STUDENT") {
      throw new AppError("Students cannot assign vocabulary", 403);
    }
    // TUTORs must share a class with the target student
    if (callerRole === "TUTOR") {
      const membership = await prisma.classUser.findFirst({
        where: {
          userId: input.assignedToUserId,
          role: "STUDENT",
          class: { users: { some: { userId: callerId, role: "TUTOR" } } },
        },
      });
      if (!membership) throw new AppError("Student not found in your classes", 404);
    }
    // ADMIN is unrestricted
  }

  const assignedByTutorId = input.assignedToUserId ? (callerRole === "TUTOR" ? callerId : null) : null;
  let item: VocabularyItem;
  try {
    item = await prisma.vocabulary.create({
      data: {
        userId,
        word: input.word.toLowerCase(),
        definition: input.definition,
        pronunciation: input.pronunciation ?? null,
        example: input.example ?? null,
        partOfSpeech: input.partOfSpeech ?? null,
        difficulty: input.difficulty,
        category: input.category ?? null,
        source,
        assignedByTutorId,
      },
      select: VOCAB_SELECT,
    }) as VocabularyItem;
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      const who = source === "ASSIGNED" ? "the student's" : "your";
      throw new AppError(`"${input.word}" is already in ${who} vocabulary list`, 409);
    }
    throw err;
  }

  // Fire notification when a tutor/admin assigns to a student
  if (input.assignedToUserId && userId !== callerId) {
    createNotification(
      userId,
      "VOCABULARY_ASSIGNED",
      `Your tutor assigned you a new word: "${input.word.toLowerCase()}"`,
      { vocabularyId: item.id },
    ).catch(() => {});
  }

  await deleteCache(cacheKeys.dashboard(userId));
  return item;
}

// ── Get by ID ─────────────────────────────────────────────────

export async function getVocabularyById(id: string, userId: string): Promise<VocabularyItem> {
  const item = await prisma.vocabulary.findUnique({
    where: { id },
    select: VOCAB_SELECT,
  });
  if (!item || item.userId !== userId) throw new AppError("Vocabulary item not found", 404);
  return item;
}

// ── Update ────────────────────────────────────────────────────

export async function updateVocabulary(
  id: string,
  userId: string,
  input: z.infer<typeof updateVocabularySchema>,
): Promise<VocabularyItem> {
  const existing = await prisma.vocabulary.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== userId) throw new AppError("Vocabulary item not found", 404);

  const item = await prisma.vocabulary.update({
    where: { id },
    data: {
      ...(input.definition !== undefined && { definition: input.definition }),
      ...(input.pronunciation !== undefined && { pronunciation: input.pronunciation }),
      ...(input.example !== undefined && { example: input.example }),
      ...(input.partOfSpeech !== undefined && { partOfSpeech: input.partOfSpeech }),
      ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
      ...(input.category !== undefined && { category: input.category }),
    },
    select: VOCAB_SELECT,
  });
  return item;
}

// ── Delete ────────────────────────────────────────────────────

export async function deleteVocabulary(id: string, userId: string): Promise<void> {
  const existing = await prisma.vocabulary.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== userId) throw new AppError("Vocabulary item not found", 404);
  await prisma.vocabulary.delete({ where: { id } });
  await deleteCache(cacheKeys.dashboard(userId));
}

// ── SRS review ────────────────────────────────────────────────

export async function reviewVocabulary(
  id: string,
  userId: string,
  quality: number,
): Promise<ReviewResult> {
  const existing = await prisma.vocabulary.findUnique({
    where: { id },
    select: {
      userId: true,
      srsInterval: true,
      srsEase: true,
      reviewCount: true,
      correctCount: true,
      incorrectCount: true,
    },
  });
  if (!existing || existing.userId !== userId) throw new AppError("Vocabulary item not found", 404);

  const { interval, ease } = sm2(
    quality,
    existing.srsInterval,
    existing.srsEase,
    existing.reviewCount,
  );

  const now = new Date();
  const nextDue = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  const isCorrect = quality >= 3;

  const updated = await prisma.vocabulary.update({
    where: { id },
    data: {
      srsInterval: interval,
      srsEase: ease,
      srsDue: nextDue,
      reviewCount: { increment: 1 },
      correctCount: isCorrect ? { increment: 1 } : undefined,
      incorrectCount: !isCorrect ? { increment: 1 } : undefined,
      masteryLevel: computeMasteryLevel(interval),
      lastPracticed: now,
    },
    select: {
      id: true,
      word: true,
      srsInterval: true,
      srsDue: true,
      srsEase: true,
      masteryLevel: true,
      reviewCount: true,
      correctCount: true,
      incorrectCount: true,
      lastPracticed: true,
    },
  });

  // Increment today's progress vocabularyPracticed counter
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.progress.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, vocabularyPracticed: 1 },
    update: { vocabularyPracticed: { increment: 1 } },
  });

  // dueVocabCount and totalWords in the dashboard are now stale
  await deleteCache(cacheKeys.dashboard(userId));

  return updated as ReviewResult;
}
