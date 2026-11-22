import type { Role } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../config/database.ts";
import { deleteCache, cacheKeys } from "../../config/cache.ts";
import { AppError } from "../../utils/AppError.ts";
import { createNotification } from "../notifications/notifications.service.ts";
import type { createClassListSchema, updateClassListSchema } from "./vocabulary.schema.ts";
import type { ClassWordList, ClassWordListCreated } from "./vocabulary.types.ts";

// shortcut: an unnamed list (words given on their own) is stored with title "" instead of a
// nullable column, to avoid a migration; make title nullable if lists ever need more states.
const sentMessage = (title: string, words: { word: string }[], _added = false) => {
  const n = words.length;
  // `_added` (words added to an existing list) reads the same as a new list: the title is a list, never a word.
  if (title) return `Your teacher added ${n} new ${n === 1 ? "word" : "words"} to "${title}"`;
  return n === 1 ? `Your teacher gave you a new word: "${words[0]!.word.toLowerCase()}"` : `Your teacher gave you ${n} new words`;
};

// Class word lists: a tutor of the class (or an admin) assigns a named set of words to all
// students, only some, or everyone except some. Each student gets their own copy of each
// word (source ASSIGNED, listId set), so reviews and mastery stay per student. A word the
// student already has is skipped, keeping their progress on it.

async function classForStaff(classId: string, callerId: string, role: Role, write: boolean) {
  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, archived: true } });
  if (!cls) throw new AppError("Class not found", 404);
  if (role !== "ADMIN") {
    const tutor = await prisma.classUser.findFirst({ where: { classId, userId: callerId, role: "TUTOR" }, select: { id: true } });
    if (!tutor) throw new AppError("Only this class's teachers can manage its word lists", 403);
  }
  if (write && cls.archived) throw new AppError("This class is archived", 403);
  return cls;
}

export async function createClassList(
  callerId: string,
  role: Role,
  classId: string,
  input: z.infer<typeof createClassListSchema>,
): Promise<ClassWordListCreated> {
  await classForStaff(classId, callerId, role, true);

  const students = await prisma.classUser.findMany({
    where: { classId, role: "STUDENT", user: { isInternal: false } },
    select: { userId: true },
  });
  const chosen = new Set(input.target.studentIds);
  const all = students.map((s) => s.userId);
  const targets =
    input.target.mode === "ALL" ? all
    : input.target.mode === "ONLY" ? all.filter((id) => chosen.has(id))
    : all.filter((id) => !chosen.has(id));
  if (!targets.length) throw new AppError("Choose at least one student", 422);

  // One card per word, even if the teacher typed it twice.
  const seen = new Set<string>();
  const words = input.words.filter((w) => {
    const key = w.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const created = await prisma.$transaction(async (tx) => {
    const list = await tx.vocabularyList.create({
      data: { classId, title: input.title, createdById: callerId },
      select: { id: true, title: true, createdAt: true },
    });
    const { count } = await tx.vocabulary.createMany({
      data: targets.flatMap((userId) =>
        words.map((w) => ({
          userId,
          word: w.word.toLowerCase(),
          definition: w.definition,
          example: w.example || null,
          partOfSpeech: w.partOfSpeech || null,
          category: input.title || null,
          source: "ASSIGNED" as const,
          assignedByTutorId: role === "TUTOR" ? callerId : null,
          listId: list.id,
        })),
      ),
      skipDuplicates: true,
    });
    return { ...list, added: count };
  });

  const message = sentMessage(input.title, words);
  await Promise.allSettled(
    targets.flatMap((userId) => [
      createNotification(userId, "VOCABULARY_ASSIGNED", message, { listId: created.id }),
      deleteCache(cacheKeys.dashboard(userId)),
    ]),
  );

  return {
    id: created.id,
    title: created.title,
    createdAt: created.createdAt,
    wordCount: words.length,
    studentCount: targets.length,
    added: created.added,
    skipped: targets.length * words.length - created.added,
  };
}

const LIST_SELECT = {
  id: true,
  title: true,
  createdAt: true,
  createdBy: { select: { id: true, displayName: true } },
  words: { select: { word: true, definition: true, example: true, partOfSpeech: true, userId: true, reviewCount: true, masteryLevel: true } },
} as const;

type ListRow = {
  id: string;
  title: string;
  createdAt: Date;
  createdBy: { id: string; displayName: string } | null;
  words: { word: string; definition: string; example: string | null; partOfSpeech: string | null; userId: string; reviewCount: number; masteryLevel: number }[];
};

/** One card per word (every student's copy is the same card) plus the class's progress on it. */
function toClassWordList(l: ListRow): ClassWordList {
  const cards = new Map<string, ClassWordList["words"][number]>();
  for (const w of l.words) {
    if (!cards.has(w.word)) cards.set(w.word, { word: w.word, definition: w.definition, example: w.example, partOfSpeech: w.partOfSpeech });
  }
  const total = l.words.length;
  const pct = (n: number) => (total ? Math.round((100 * n) / total) : 0);
  return {
    id: l.id,
    title: l.title,
    createdAt: l.createdAt,
    createdBy: l.createdBy,
    words: [...cards.values()].sort((x, y) => x.word.localeCompare(y.word)),
    studentCount: new Set(l.words.map((w) => w.userId)).size,
    practisedPct: pct(l.words.filter((w) => w.reviewCount > 0).length),
    masteredPct: pct(l.words.filter((w) => w.masteryLevel >= 5).length),
  };
}

export async function listClassLists(callerId: string, role: Role, classId: string): Promise<ClassWordList[]> {
  await classForStaff(classId, callerId, role, false);
  const lists = await prisma.vocabularyList.findMany({ where: { classId }, orderBy: { createdAt: "desc" }, select: LIST_SELECT });
  return lists.map(toClassWordList);
}

/**
 * Edit a list: rename it, change cards (every student's copy follows, their progress stays),
 * and add words, which go to the students who already have the list. Nothing is removed.
 */
export async function updateClassList(
  callerId: string,
  role: Role,
  classId: string,
  listId: string,
  input: z.infer<typeof updateClassListSchema>,
): Promise<ClassWordList & { addedWords: number }> {
  await classForStaff(classId, callerId, role, true);
  const list = await prisma.vocabularyList.findFirst({ where: { id: listId, classId }, select: { id: true, title: true } });
  if (!list) throw new AppError("Word list not found", 404);

  const copies = await prisma.vocabulary.findMany({ where: { listId }, select: { word: true, userId: true } });
  const students = [...new Set(copies.map((c) => c.userId))];
  const existing = new Set(copies.map((c) => c.word));
  const title = input.title ?? list.title;

  const seen = new Set<string>();
  const cards = (input.words ?? []).filter((w) => {
    const key = w.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const fresh = cards.filter((w) => !existing.has(w.word.toLowerCase()));
  if (existing.size + fresh.length > 30) throw new AppError("A list holds up to 30 words", 422);

  await prisma.$transaction(async (tx) => {
    if (input.title !== undefined && input.title !== list.title) {
      await tx.vocabularyList.update({ where: { id: listId }, data: { title } });
      await tx.vocabulary.updateMany({ where: { listId }, data: { category: title || null } });
    }
    for (const w of cards.filter((c) => existing.has(c.word.toLowerCase()))) {
      await tx.vocabulary.updateMany({
        where: { listId, word: w.word.toLowerCase() },
        data: { definition: w.definition, example: w.example || null, partOfSpeech: w.partOfSpeech || null },
      });
    }
    if (fresh.length && students.length) {
      await tx.vocabulary.createMany({
        data: students.flatMap((userId) =>
          fresh.map((w) => ({
            userId,
            word: w.word.toLowerCase(),
            definition: w.definition,
            example: w.example || null,
            partOfSpeech: w.partOfSpeech || null,
            category: title || null,
            source: "ASSIGNED" as const,
            assignedByTutorId: role === "TUTOR" ? callerId : null,
            listId,
          })),
        ),
        skipDuplicates: true,
      });
    }
  });

  if (fresh.length) {
    const message = sentMessage(title, fresh, true);
    await Promise.allSettled(
      students.flatMap((userId) => [
        createNotification(userId, "VOCABULARY_ASSIGNED", message, { listId }),
        deleteCache(cacheKeys.dashboard(userId)),
      ]),
    );
  }

  const updated = await prisma.vocabularyList.findUniqueOrThrow({ where: { id: listId }, select: LIST_SELECT });
  return { ...toClassWordList(updated), addedWords: students.length ? fresh.length : 0 };
}
