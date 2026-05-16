import type { Prisma, Role, SubStatus } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import type { UserListItem, UserDetail } from "./users.types.ts";

const USER_LIST_SELECT = {
  id: true,
  username: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  isActive: true,
  role: true,
  phoneNumber: true,
  createdAt: true,
  subscription: {
    select: { plan: true, status: true, currentPeriodEnd: true },
  },
} as const;

export async function getUsers(
  page: number,
  limit: number,
  role?: Role,
  search?: string,
  subscriptionStatus?: SubStatus,
): Promise<{ users: UserListItem[]; total: number }> {
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (subscriptionStatus) where.subscription = { status: subscriptionStatus };
  if (search) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { displayName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: USER_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users: users as UserListItem[], total };
}

export async function getUserById(id: string): Promise<UserDetail> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...USER_LIST_SELECT,
      updatedAt: true,
      learnerProfile: {
        select: {
          id: true,
          currentLevel: true,
          targetLevel: true,
          learningPurpose: true,
          weeklyGoalMinutes: true,
          timezone: true,
          uiLanguage: true,
          theme: true,
        },
      },
      subscription: {
        select: {
          id: true,
          plan: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
        },
      },
      metrics: {
        select: {
          id: true,
          totalStudyTimeMinutes: true,
          totalWordsTyped: true,
          lessonsCompleted: true,
          currentStreak: true,
          longestStreak: true,
          lastStudyDate: true,
          estimatedLevel: true,
        },
      },
      classUsers: {
        select: {
          id: true,
          role: true,
          class: {
            select: {
              id: true,
              className: true,
              classCode: true,
              classStatus: true,
            },
          },
        },
      },
    },
  });

  if (!user) throw new AppError("User not found", 404);

  return user as UserDetail;
}
