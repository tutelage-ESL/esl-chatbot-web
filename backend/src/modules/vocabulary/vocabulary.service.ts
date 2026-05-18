import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import type { VocabularyItem, VocabularyStats, ReviewResult } from "./vocabulary.types.ts";
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

export async function addVocabulary(
  userId: string,
  input: z.infer<typeof addVocabularySchema>,
): Promise<VocabularyItem> {
  try {
    const item = await prisma.vocabulary.create({
      data: {
        userId,
        word: input.word.toLowerCase(),
        definition: input.definition,
        pronunciation: input.pronunciation ?? null,
        example: input.example ?? null,
        partOfSpeech: input.partOfSpeech ?? null,
        difficulty: input.difficulty,
        category: input.category ?? null,
        source: "MANUAL",
      },
      select: VOCAB_SELECT,
    });
    return item;
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      throw new AppError(`"${input.word}" is already in your vocabulary list`, 409);
    }
    throw err;
  }
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

  return updated as ReviewResult;
}
