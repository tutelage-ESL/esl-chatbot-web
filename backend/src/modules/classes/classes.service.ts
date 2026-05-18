import type { ClassStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import {
  generateClassCode,
  computeExpiryFromInterval,
  isExpired,
} from "./classCode.util.ts";
import type {
  ClassListItem,
  ClassDetail,
  ClassCodeInfo,
  JoinClassResult,
  ClassStudentSummary,
  ClassStudentDetail,
} from "./classes.types.ts";

// ── Shared refresh helper ─────────────────────────────────

/**
 * Rotate the class code to a new value if (and only if) the current one
 * has expired. Idempotent and safe to call from any read path.
 *
 * Returns true if a rotation actually happened.
 *
 * Used by:
 *  - the join flow (lazy refresh + reject with 410)
 *  - the class detail / "my classes" reads (so tutors see a fresh code
 *    just by opening the class, no manual click required)
 */
async function refreshIfExpired(classId: string): Promise<boolean> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      classCodeExpiresAt: true,
      classCodeRefreshIntervalSeconds: true,
    },
  });
  if (!cls) return false;
  if (!isExpired(cls.classCodeExpiresAt)) return false;

  const refreshedAt = new Date();
  const newExpiresAt = computeExpiryFromInterval(
    cls.classCodeRefreshIntervalSeconds,
    refreshedAt,
  );

  for (let attempt = 0; attempt < 5; attempt++) {
    const newCode = generateClassCode();
    try {
      await prisma.class.update({
        where: { id: classId },
        data: {
          classCode: newCode,
          classCodeExpiresAt: newExpiresAt,
          classCodeRefreshedAt: refreshedAt,
        },
      });
      return true;
    } catch (err) {
      const e = err as { code?: string; meta?: { target?: string[] } };
      if (e.code === "P2002" && e.meta?.target?.includes("classCode")) continue;
      throw err;
    }
  }
  throw new AppError("Failed to refresh expired class code", 500);
}

// ── Read paths (admin) ─────────────────────────────────────

const CLASS_LIST_SELECT = {
  id: true,
  className: true,
  classCode: true,
  classCategory: true,
  classStatus: true,
  classCodeBlocked: true,
  classCodeExpiresAt: true,
  classCodeRefreshIntervalSeconds: true,
  createdAt: true,
  _count: { select: { users: true } },
} satisfies Prisma.ClassSelect;

export async function getClasses(
  page: number,
  limit: number,
  status?: ClassStatus,
): Promise<{ classes: ClassListItem[]; total: number }> {
  const skip = (page - 1) * limit;
  const where = status ? { classStatus: status } : {};

  const [rawClasses, total] = await prisma.$transaction([
    prisma.class.findMany({
      where,
      select: CLASS_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.class.count({ where }),
  ]);

  const classes: ClassListItem[] = rawClasses.map((c) => ({
    id: c.id,
    className: c.className,
    classCode: c.classCode,
    classCategory: c.classCategory,
    classStatus: c.classStatus,
    classCodeBlocked: c.classCodeBlocked,
    classCodeExpiresAt: c.classCodeExpiresAt,
    classCodeRefreshIntervalSeconds: c.classCodeRefreshIntervalSeconds,
    createdAt: c.createdAt,
    memberCount: c._count.users,
  }));

  return { classes, total };
}

/**
 * Internal: read class detail with members. No authorization, no refresh.
 * Used by `getClassById` and `createClass` (which has just minted the row).
 */
async function readClassDetail(id: string): Promise<ClassDetail> {
  const cls = await prisma.class.findUnique({
    where: { id },
    select: {
      id: true,
      className: true,
      classCode: true,
      classCategory: true,
      classStatus: true,
      classCodeBlocked: true,
      classCodeExpiresAt: true,
      classCodeRefreshIntervalSeconds: true,
      classCodeRefreshedAt: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      users: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cls) throw new AppError("Class not found", 404);

  return {
    ...cls,
    members: cls.users,
  };
}

/**
 * Read a class by ID, gated by membership.
 *
 * Authorization rules:
 *  - ADMIN: always allowed
 *  - Class members (tutor or student): allowed
 *  - Anyone else: 404 (do not reveal that the class exists)
 *
 * Refresh-on-read: if the caller is an admin or a tutor of this class
 * AND the code is expired, the code is rotated lazily before the read.
 * Student callers do NOT trigger a rotation — they cannot bump it by
 * spamming reads, and they generally don't need a fresh code anyway.
 */
export async function getClassById(
  id: string,
  actorUserId: string,
  actorRole: Role,
): Promise<ClassDetail> {
  const isAdmin = actorRole === "ADMIN";

  // Look up the caller's membership (if any) — also serves as the
  // existence/access check for non-admins.
  const membership = await prisma.classUser.findUnique({
    where: { classId_userId: { classId: id, userId: actorUserId } },
    select: { role: true },
  });

  if (!isAdmin && !membership) {
    throw new AppError("Class not found", 404);
  }

  // Refresh-on-read for tutors and admins only.
  const canTriggerRefresh = isAdmin || membership?.role === "TUTOR";
  if (canTriggerRefresh) {
    await refreshIfExpired(id);
  }

  return readClassDetail(id);
}

// ── Create / update class ──────────────────────────────────

export interface CreateClassInput {
  className: string;
  classCategory?: string | null;
  classCodeRefreshIntervalSeconds?: number | null;
}

/**
 * Create a class. The creator (a tutor or admin) is automatically added to
 * the class as a TUTOR member, and a fresh class code is generated.
 *
 * Code uniqueness is enforced by retrying on the @unique constraint —
 * collisions are vanishingly rare with an 8-char alphabet of 31 symbols
 * (≈ 8.5 * 10^11 combinations) but the retry guards against the worst case.
 */
export async function createClass(
  creatorUserId: string,
  input: CreateClassInput,
): Promise<ClassDetail> {
  const refreshedAt = new Date();
  const expiresAt = computeExpiryFromInterval(
    input.classCodeRefreshIntervalSeconds,
    refreshedAt,
  );

  // Retry up to 5 times on unique-code collision before giving up.
  for (let attempt = 0; attempt < 5; attempt++) {
    const classCode = generateClassCode();
    try {
      const cls = await prisma.$transaction(async (tx) => {
        const created = await tx.class.create({
          data: {
            className: input.className,
            classCategory: input.classCategory ?? null,
            classCode,
            classCodeRefreshIntervalSeconds:
              input.classCodeRefreshIntervalSeconds ?? null,
            classCodeExpiresAt: expiresAt,
            classCodeRefreshedAt: refreshedAt,
            createdById: creatorUserId,
          },
        });
        await tx.classUser.create({
          data: {
            classId: created.id,
            userId: creatorUserId,
            role: "TUTOR",
          },
        });
        return created.id;
      });
      return await readClassDetail(cls);
    } catch (err) {
      // P2002 = unique constraint violation; only retry on classCode collision.
      const e = err as { code?: string; meta?: { target?: string[] } };
      if (e.code === "P2002" && e.meta?.target?.includes("classCode")) continue;
      throw err;
    }
  }

  throw new AppError("Failed to generate a unique class code, try again", 500);
}

// ── Authorization helper ───────────────────────────────────

/**
 * Throws unless the given user is a TUTOR member of the class (or an ADMIN).
 * Used by every code-management endpoint.
 */
async function assertTutorOfClass(classId: string, userId: string, userRole: string): Promise<void> {
  if (userRole === "ADMIN") return;
  const membership = await prisma.classUser.findUnique({
    where: { classId_userId: { classId, userId } },
    select: { role: true },
  });
  if (!membership) throw new AppError("Class not found", 404);
  if (membership.role !== "TUTOR") {
    throw new AppError("Only tutors of this class can manage the class code", 403);
  }
}

// ── Code management ────────────────────────────────────────

function toCodeInfo(c: {
  id: string;
  classCode: string;
  classCodeBlocked: boolean;
  classCodeExpiresAt: Date | null;
  classCodeRefreshIntervalSeconds: number | null;
  classCodeRefreshedAt: Date;
}): ClassCodeInfo {
  return {
    classId: c.id,
    classCode: c.classCode,
    classCodeBlocked: c.classCodeBlocked,
    classCodeExpiresAt: c.classCodeExpiresAt,
    classCodeRefreshIntervalSeconds: c.classCodeRefreshIntervalSeconds,
    classCodeRefreshedAt: c.classCodeRefreshedAt,
  };
}

/**
 * Rotate the class code now (manual refresh). Resets the expiry window
 * based on the class's current refresh interval. Does NOT unblock a
 * blocked code — call unblock separately if needed.
 */
export async function refreshClassCode(
  classId: string,
  actorUserId: string,
  actorRole: string,
): Promise<ClassCodeInfo> {
  await assertTutorOfClass(classId, actorUserId, actorRole);

  const existing = await prisma.class.findUnique({
    where: { id: classId },
    select: { classCodeRefreshIntervalSeconds: true },
  });
  if (!existing) throw new AppError("Class not found", 404);

  const refreshedAt = new Date();
  const expiresAt = computeExpiryFromInterval(
    existing.classCodeRefreshIntervalSeconds,
    refreshedAt,
  );

  for (let attempt = 0; attempt < 5; attempt++) {
    const newCode = generateClassCode();
    try {
      const updated = await prisma.class.update({
        where: { id: classId },
        data: {
          classCode: newCode,
          classCodeExpiresAt: expiresAt,
          classCodeRefreshedAt: refreshedAt,
        },
        select: {
          id: true,
          classCode: true,
          classCodeBlocked: true,
          classCodeExpiresAt: true,
          classCodeRefreshIntervalSeconds: true,
          classCodeRefreshedAt: true,
        },
      });
      return toCodeInfo(updated);
    } catch (err) {
      const e = err as { code?: string; meta?: { target?: string[] } };
      if (e.code === "P2002" && e.meta?.target?.includes("classCode")) continue;
      throw err;
    }
  }

  throw new AppError("Failed to generate a unique class code, try again", 500);
}

/**
 * Update the auto-refresh interval. Recomputes the expiry from the
 * current refreshedAt so the new schedule takes effect immediately.
 * Pass `null` (or omit) to make the code permanent.
 */
export async function updateClassCodeSettings(
  classId: string,
  actorUserId: string,
  actorRole: string,
  refreshIntervalSeconds: number | null,
): Promise<ClassCodeInfo> {
  await assertTutorOfClass(classId, actorUserId, actorRole);

  const existing = await prisma.class.findUnique({
    where: { id: classId },
    select: { classCodeRefreshedAt: true },
  });
  if (!existing) throw new AppError("Class not found", 404);

  const expiresAt = computeExpiryFromInterval(
    refreshIntervalSeconds,
    existing.classCodeRefreshedAt,
  );

  const updated = await prisma.class.update({
    where: { id: classId },
    data: {
      classCodeRefreshIntervalSeconds: refreshIntervalSeconds,
      classCodeExpiresAt: expiresAt,
    },
    select: {
      id: true,
      classCode: true,
      classCodeBlocked: true,
      classCodeExpiresAt: true,
      classCodeRefreshIntervalSeconds: true,
      classCodeRefreshedAt: true,
    },
  });
  return toCodeInfo(updated);
}

/**
 * Block (true) or unblock (false) the class code.
 * Blocking does NOT change the code value or its expiry — it only
 * prevents new join attempts.
 */
export async function setClassCodeBlocked(
  classId: string,
  actorUserId: string,
  actorRole: string,
  blocked: boolean,
): Promise<ClassCodeInfo> {
  await assertTutorOfClass(classId, actorUserId, actorRole);

  const updated = await prisma.class
    .update({
      where: { id: classId },
      data: { classCodeBlocked: blocked },
      select: {
        id: true,
        classCode: true,
        classCodeBlocked: true,
        classCodeExpiresAt: true,
        classCodeRefreshIntervalSeconds: true,
        classCodeRefreshedAt: true,
      },
    })
    .catch((err: { code?: string }) => {
      if (err.code === "P2025") throw new AppError("Class not found", 404);
      throw err;
    });

  return toCodeInfo(updated);
}

// ── Join by code ───────────────────────────────────────────

/**
 * Join a class by class code. No tutor approval required.
 *
 * Rejects with 410 (Gone) if the code is expired (after auto-refreshing it
 * to a new value internally so the next call from someone with the *new*
 * code can succeed) or if the code is blocked.
 *
 * Rejects with 409 if the user is already a member.
 */
export async function joinClassByCode(
  userId: string,
  rawCode: string,
): Promise<JoinClassResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new AppError("Class code is required", 400);

  // Look up the class purely by the supplied code first.
  const cls = await prisma.class.findUnique({
    where: { classCode: code },
    select: {
      id: true,
      className: true,
      classCode: true,
      classStatus: true,
      classCodeBlocked: true,
      classCodeExpiresAt: true,
    },
  });
  if (!cls) throw new AppError("Invalid class code", 404);
  if (cls.classStatus !== "ACTIVE") {
    throw new AppError("This class is not currently active", 409);
  }
  if (cls.classCodeBlocked) {
    throw new AppError("This class code is blocked. Ask the tutor for access.", 403);
  }

  // If the code on file is expired, rotate it lazily and reject.
  // The user must obtain the new code from the tutor.
  if (isExpired(cls.classCodeExpiresAt)) {
    await refreshIfExpired(cls.id);
    throw new AppError("This class code has expired. Ask the tutor for the new code.", 410);
  }

  // Insert membership; rely on the unique(classId, userId) constraint to
  // detect duplicate joins atomically.
  try {
    const membership = await prisma.classUser.create({
      data: {
        classId: cls.id,
        userId,
        role: "STUDENT",
      },
      select: { createdAt: true, role: true },
    });
    return {
      classId: cls.id,
      className: cls.className,
      classCode: cls.classCode,
      role: membership.role,
      joinedAt: membership.createdAt,
    };
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      throw new AppError("You are already a member of this class", 409);
    }
    throw err;
  }
}

// ── Student monitoring (tutor / admin) ────────────────────

/**
 * Return all STUDENT members of a class with progress data.
 * Requires the caller to be a tutor of the class or an admin.
 */
export async function getClassStudents(
  classId: string,
  actorUserId: string,
  actorRole: string,
): Promise<ClassStudentSummary[]> {
  const isAdmin = actorRole === "ADMIN";

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true },
  });
  if (!cls) throw new AppError("Class not found", 404);

  if (!isAdmin) {
    const membership = await prisma.classUser.findUnique({
      where: { classId_userId: { classId, userId: actorUserId } },
      select: { role: true },
    });
    if (!membership) throw new AppError("Class not found", 404);
    if (membership.role !== "TUTOR") {
      throw new AppError("Only tutors and admins can view student progress", 403);
    }
  }

  const members = await prisma.classUser.findMany({
    where: { classId, role: "STUDENT" },
    select: {
      createdAt: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          learnerProfile: { select: { currentLevel: true, targetLevel: true } },
          metrics: {
            select: {
              currentStreak: true,
              estimatedLevel: true,
              totalStudyTimeMinutes: true,
              grammarSkill: true,
              vocabularySkill: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (members.length === 0) return [];

  const studentIds = members.map((m) => m.user.id);
  const now = new Date();

  const [vocabTotals, vocabDueCounts] = await Promise.all([
    prisma.vocabulary.groupBy({
      by: ["userId"],
      where: { userId: { in: studentIds } },
      orderBy: { userId: "asc" },
      _count: { _all: true },
    }),
    prisma.vocabulary.groupBy({
      by: ["userId"],
      where: { userId: { in: studentIds }, srsDue: { lte: now } },
      orderBy: { userId: "asc" },
      _count: { _all: true },
    }),
  ]);

  const vocabTotalMap = new Map(
    vocabTotals.map((v) => [v.userId, (v._count as { _all: number })._all]),
  );
  const vocabDueMap = new Map(
    vocabDueCounts.map((v) => [v.userId, (v._count as { _all: number })._all]),
  );

  return members.map((m) => ({
    userId: m.user.id,
    username: m.user.username,
    displayName: m.user.displayName,
    avatarUrl: m.user.avatarUrl,
    joinedAt: m.createdAt,
    currentLevel: m.user.learnerProfile?.currentLevel ?? null,
    targetLevel: m.user.learnerProfile?.targetLevel ?? null,
    currentStreak: m.user.metrics?.currentStreak ?? 0,
    estimatedLevel: m.user.metrics?.estimatedLevel ?? null,
    totalStudyTimeMinutes: m.user.metrics?.totalStudyTimeMinutes ?? 0,
    grammarSkill: m.user.metrics?.grammarSkill ?? 0,
    vocabularySkill: m.user.metrics?.vocabularySkill ?? 0,
    vocabTotal: vocabTotalMap.get(m.user.id) ?? 0,
    vocabDueToday: vocabDueMap.get(m.user.id) ?? 0,
  }));
}

/**
 * Full progress detail for a single student in the class.
 * Requires the caller to be a tutor of the class or an admin.
 */
export async function getClassStudentDetail(
  classId: string,
  studentId: string,
  actorUserId: string,
  actorRole: string,
): Promise<ClassStudentDetail> {
  const isAdmin = actorRole === "ADMIN";

  if (!isAdmin) {
    const membership = await prisma.classUser.findUnique({
      where: { classId_userId: { classId, userId: actorUserId } },
      select: { role: true },
    });
    if (!membership) throw new AppError("Class not found", 404);
    if (membership.role !== "TUTOR") {
      throw new AppError("Only tutors and admins can view student detail", 403);
    }
  } else {
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
    if (!cls) throw new AppError("Class not found", 404);
  }

  const targetMembership = await prisma.classUser.findUnique({
    where: { classId_userId: { classId, userId: studentId } },
    select: { role: true, createdAt: true },
  });
  if (!targetMembership) throw new AppError("Student not found in this class", 404);
  if (targetMembership.role !== "STUDENT") {
    throw new AppError("That user is not a student in this class", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      learnerProfile: {
        select: {
          currentLevel: true,
          targetLevel: true,
          learningPurpose: true,
          topicsOfInterest: true,
          weeklyGoalMinutes: true,
          timezone: true,
          aiPersonality: true,
        },
      },
      metrics: {
        select: {
          currentStreak: true,
          longestStreak: true,
          estimatedLevel: true,
          totalStudyTimeMinutes: true,
          grammarSkill: true,
          vocabularySkill: true,
          fluencySkill: true,
          speakingSkill: true,
          lastStudyDate: true,
        },
      },
      _count: { select: { vocabularies: true } },
    },
  });
  if (!user) throw new AppError("Student not found", 404);

  const vocabDueToday = await prisma.vocabulary.count({
    where: { userId: studentId, srsDue: { lte: new Date() } },
  });

  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    joinedAt: targetMembership.createdAt,
    learnerProfile: user.learnerProfile,
    metrics: user.metrics,
    vocabTotal: user._count.vocabularies,
    vocabDueToday,
  };
}

// ── Remove member ──────────────────────────────────────────

/**
 * Remove a member from a class.
 *
 * Authorization:
 *  - Any member can remove themselves (self-leave).
 *  - A tutor of the class can remove STUDENT members (not other tutors).
 *  - An admin can remove any member.
 *
 * Guard: the last tutor of a class cannot be removed.
 */
export async function removeMember(
  classId: string,
  targetUserId: string,
  actorUserId: string,
  actorRole: string,
): Promise<void> {
  const isAdmin = actorRole === "ADMIN";
  const isSelf = actorUserId === targetUserId;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true },
  });
  if (!cls) throw new AppError("Class not found", 404);

  const targetMembership = await prisma.classUser.findUnique({
    where: { classId_userId: { classId, userId: targetUserId } },
    select: { role: true },
  });
  if (!targetMembership) throw new AppError("Member not found in this class", 404);

  if (!isSelf && !isAdmin) {
    const actorMembership = await prisma.classUser.findUnique({
      where: { classId_userId: { classId, userId: actorUserId } },
      select: { role: true },
    });
    if (!actorMembership) throw new AppError("Class not found", 404);
    if (actorMembership.role !== "TUTOR") {
      throw new AppError("Only tutors and admins can remove members", 403);
    }
    if (targetMembership.role !== "STUDENT") {
      throw new AppError("Tutors can only remove student members", 403);
    }
  }

  await prisma.$transaction(async (tx) => {
    if (targetMembership.role === "TUTOR") {
      const tutorCount = await tx.classUser.count({ where: { classId, role: "TUTOR" } });
      if (tutorCount <= 1) {
        throw new AppError("Cannot remove the last tutor from a class", 409);
      }
    }
    await tx.classUser.delete({
      where: { classId_userId: { classId, userId: targetUserId } },
    });
  });
}

// ── List classes the current user belongs to ──────────────

export interface MyClassListItem {
  id: string;
  className: string;
  classCode: string;
  classCategory: string | null;
  classStatus: ClassStatus;
  myRole: "STUDENT" | "TUTOR" | "ADMIN";
  memberCount: number;
  joinedAt: Date;
  // Code lifecycle (only useful for tutors but harmless to expose):
  classCodeBlocked: boolean;
  classCodeExpiresAt: Date | null;
  classCodeRefreshIntervalSeconds: number | null;
  classCodeRefreshedAt: Date;
}

export async function listMyClasses(userId: string): Promise<MyClassListItem[]> {
  // Refresh-on-read: find any classes where the caller is a TUTOR and the
  // code is currently expired, then rotate them before reading the list.
  // Student memberships are skipped — students cannot bump the rotation by
  // listing their classes. Admins still see whatever they happen to be a
  // member of; they should use the /classes endpoint for the global view.
  const expiredTutorMemberships = await prisma.classUser.findMany({
    where: {
      userId,
      role: "TUTOR",
      class: {
        classCodeExpiresAt: { lt: new Date(), not: null },
      },
    },
    select: { classId: true },
  });

  // Sequential is fine — having multiple expired classes per tutor at the
  // moment of the read is rare, and parallel updates on different rows
  // gain little here.
  for (const m of expiredTutorMemberships) {
    await refreshIfExpired(m.classId);
  }

  const memberships = await prisma.classUser.findMany({
    where: { userId },
    select: {
      role: true,
      createdAt: true,
      class: {
        select: {
          id: true,
          className: true,
          classCode: true,
          classCategory: true,
          classStatus: true,
          classCodeBlocked: true,
          classCodeExpiresAt: true,
          classCodeRefreshIntervalSeconds: true,
          classCodeRefreshedAt: true,
          _count: { select: { users: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((m) => ({
    id: m.class.id,
    className: m.class.className,
    classCode: m.class.classCode,
    classCategory: m.class.classCategory,
    classStatus: m.class.classStatus,
    myRole: m.role,
    memberCount: m.class._count.users,
    joinedAt: m.createdAt,
    classCodeBlocked: m.class.classCodeBlocked,
    classCodeExpiresAt: m.class.classCodeExpiresAt,
    classCodeRefreshIntervalSeconds: m.class.classCodeRefreshIntervalSeconds,
    classCodeRefreshedAt: m.class.classCodeRefreshedAt,
  }));
}
