import type { Prisma, GoalStatus, GoalType, Role } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import { deleteCache, cacheKeys } from "../../config/cache.ts";
import { createNotification } from "../notifications/notifications.service.ts";
import type { GoalItem } from "./goals.types.ts";
import type { CreateGoalInput, UpdateGoalInput, ListGoalsQuery } from "./goals.schema.ts";

const GOAL_SELECT = {
  id: true,
  userId: true,
  assignedByTutorId: true,
  type: true,
  description: true,
  target: true,
  difficulty: true,
  status: true,
  progress: true,
  actionPlan: true,
  startDate: true,
  targetDate: true,
  completedDate: true,
  lastProgressUpdate: true,
  createdAt: true,
  updatedAt: true,
  assignedByTutor: {
    select: { id: true, displayName: true, avatarUrl: true },
  },
} as const;

export async function listGoals(
  callerId: string,
  callerRole: Role,
  query: ListGoalsQuery,
): Promise<{ goals: GoalItem[]; total: number }> {
  const { page, limit, status, type, studentId } = query;
  const skip = (page - 1) * limit;

  let targetUserId: string;

  if (studentId) {
    if (callerRole === "STUDENT") throw new AppError("Access denied", 403);
    if (callerRole === "TUTOR") {
      // Verify student is in one of the tutor's classes
      const membership = await prisma.classUser.findFirst({
        where: {
          userId: studentId,
          role: "STUDENT",
          class: { users: { some: { userId: callerId, role: "TUTOR" } } },
        },
      });
      if (!membership) throw new AppError("Student not found in your classes", 404);
    }
    targetUserId = studentId;
  } else {
    targetUserId = callerId;
  }

  const where: Prisma.GoalWhereInput = { userId: targetUserId };
  if (status) where.status = status;
  if (type) where.type = type;

  const [goals, total] = await prisma.$transaction([
    prisma.goal.findMany({
      where,
      select: GOAL_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.goal.count({ where }),
  ]);

  return { goals: goals as GoalItem[], total };
}

export async function createGoal(
  callerId: string,
  callerRole: Role,
  input: CreateGoalInput,
): Promise<GoalItem> {
  let userId: string;
  let assignedByTutorId: string | null = null;

  if (input.assignedToUserId) {
    if (callerRole === "STUDENT") {
      throw new AppError("Students cannot assign goals to others", 403);
    }
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
    userId = input.assignedToUserId;
    assignedByTutorId = callerId;
  } else {
    userId = callerId;
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      assignedByTutorId,
      type: input.type as GoalType,
      description: input.description,
      target: input.target,
      difficulty: input.difficulty ?? null,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      actionPlan: input.actionPlan ?? null,
    },
    select: GOAL_SELECT,
  });

  // Notify student when a tutor assigns them a goal
  if (assignedByTutorId) {
    await createNotification(
      userId,
      "GOAL_ASSIGNED",
      `Your tutor assigned you a new goal: ${input.description.slice(0, 80)}`,
      { goalId: goal.id },
    ).catch(() => {});
  }

  await deleteCache(cacheKeys.dashboard(userId));

  return goal as GoalItem;
}

async function findGoalOrThrow(goalId: string): Promise<GoalItem> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: GOAL_SELECT,
  });
  if (!goal) throw new AppError("Goal not found", 404);
  return goal as GoalItem;
}

function assertCanAccess(goal: GoalItem, callerId: string, callerRole: Role): void {
  if (callerRole === "ADMIN") return;
  if (goal.userId === callerId || goal.assignedByTutorId === callerId) return;
  throw new AppError("Access denied", 403);
}

/** Given by a teacher or admin (not set by the student themselves). */
const isAssigned = (goal: GoalItem) => !!goal.assignedByTutorId && goal.assignedByTutorId !== goal.userId;

// What a student may still change on a goal someone else gave them: working on it, not its terms.
const STUDENT_ASSIGNED_FIELDS = new Set(["progress", "status"]);

export async function getGoalById(
  goalId: string,
  callerId: string,
  callerRole: Role,
): Promise<GoalItem> {
  const goal = await findGoalOrThrow(goalId);
  assertCanAccess(goal, callerId, callerRole);
  return goal;
}

export async function updateGoal(
  goalId: string,
  callerId: string,
  callerRole: Role,
  input: UpdateGoalInput,
): Promise<GoalItem> {
  const goal = await findGoalOrThrow(goalId);
  assertCanAccess(goal, callerId, callerRole);

  // A finished goal is a record; only an admin can still change it.
  if (goal.status === "COMPLETED" && callerRole !== "ADMIN") {
    throw new AppError("A completed goal can't be changed", 409);
  }
  if (callerRole === "STUDENT" && isAssigned(goal) && Object.keys(input).some((k) => !STUDENT_ASSIGNED_FIELDS.has(k))) {
    throw new AppError("Goals from your teacher can't be edited. You can still update your progress.", 403);
  }

  const data: Prisma.GoalUpdateInput = { ...input };

  if (input.status === "COMPLETED" && goal.status !== "COMPLETED") {
    data.completedDate = new Date();
    data.progress = 100;
  }

  if (input.progress !== undefined) {
    data.lastProgressUpdate = new Date();
  }

  if (input.targetDate !== undefined) {
    data.targetDate = input.targetDate ? new Date(input.targetDate) : null;
  }

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data,
    select: GOAL_SELECT,
  });

  // Notify user when their goal is completed
  if (input.status === "COMPLETED" && goal.status !== "COMPLETED") {
    await createNotification(
      goal.userId,
      "GOAL_COMPLETED",
      `You completed a goal: ${goal.description.slice(0, 80)}`,
      { goalId },
    ).catch(() => {});
  }

  await deleteCache(cacheKeys.dashboard(goal.userId));

  return updated as GoalItem;
}

export async function deleteGoal(
  goalId: string,
  callerId: string,
  callerRole: Role,
): Promise<void> {
  const goal = await findGoalOrThrow(goalId);
  assertCanAccess(goal, callerId, callerRole);
  if (callerRole === "STUDENT" && isAssigned(goal)) {
    throw new AppError("Goals from your teacher can't be deleted.", 403);
  }
  await prisma.goal.delete({ where: { id: goalId } });
  await deleteCache(cacheKeys.dashboard(goal.userId));
}
