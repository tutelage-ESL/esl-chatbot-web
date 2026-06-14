import type { Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import type { GlobalSearchResults } from "./search.types.ts";

// Max results returned per entity group — this powers a quick command-palette,
// not a full search page, so each group stays small.
const PER_TYPE_LIMIT = 6;

// Case-insensitive "contains" filter helper.
const like = (value: string) => ({ contains: value, mode: "insensitive" as const });

/**
 * Role-aware global search.
 *
 * - Everyone searches their OWN learner content (vocabulary, goals, sessions).
 * - Classes: ADMIN sees every class; TUTOR/STUDENT only classes they belong to.
 * - Users: ADMIN only (stealth `isInternal` accounts are always excluded), since
 *   there is no tutor/student-facing global user page to route to.
 */
export async function globalSearch(
  q: string,
  actorId: string,
  actorRole: Role,
): Promise<GlobalSearchResults> {
  const isAdmin = actorRole === "ADMIN";

  const classWhere: Prisma.ClassWhereInput = {
    className: like(q),
    ...(isAdmin ? {} : { users: { some: { userId: actorId } } }),
  };

  const [users, classes, vocabulary, goals, sessions] = await Promise.all([
    // Users — ADMIN only; stealth internal accounts never surface.
    isAdmin
      ? prisma.user.findMany({
          where: {
            isInternal: false,
            OR: [{ displayName: like(q) }, { username: like(q) }, { email: like(q) }],
          },
          select: { id: true, displayName: true, username: true, email: true, avatarUrl: true, role: true },
          orderBy: { createdAt: "desc" },
          take: PER_TYPE_LIMIT,
        })
      : Promise.resolve([]),

    // Classes — scoped by role.
    prisma.class.findMany({
      where: classWhere,
      select: { id: true, className: true, classCategory: true },
      orderBy: { createdAt: "desc" },
      take: PER_TYPE_LIMIT,
    }),

    // Own vocabulary (word or definition).
    prisma.vocabulary.findMany({
      where: { userId: actorId, OR: [{ word: like(q) }, { definition: like(q) }] },
      select: { id: true, word: true, definition: true },
      orderBy: { updatedAt: "desc" },
      take: PER_TYPE_LIMIT,
    }),

    // Own goals (by description).
    prisma.goal.findMany({
      where: { userId: actorId, description: like(q) },
      select: { id: true, description: true, type: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: PER_TYPE_LIMIT,
    }),

    // Own conversation sessions (by topic; nullable topics simply won't match).
    prisma.conversationSession.findMany({
      where: { userId: actorId, topic: like(q) },
      select: { id: true, topic: true, startedAt: true },
      orderBy: { startedAt: "desc" },
      take: PER_TYPE_LIMIT,
    }),
  ]);

  const total =
    users.length + classes.length + vocabulary.length + goals.length + sessions.length;

  return {
    query: q,
    results: { users, classes, vocabulary, goals, sessions },
    total,
  };
}
