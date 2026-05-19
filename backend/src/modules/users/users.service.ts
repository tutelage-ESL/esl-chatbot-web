import { Prisma } from "@prisma/client";
import type { Role, SubStatus } from "@prisma/client";
import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import type { UserListItem, UserDetail, MyProfile, DashboardData } from "./users.types.ts";
import type { UpdateMyProfileInput, UpdateLearnerProfileInput } from "./users.schema.ts";

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
          currentStreak: true,
          longestStreak: true,
          lastStudyDate: true,
          estimatedLevel: true,
          grammarSkill: true,
          vocabularySkill: true,
          fluencySkill: true,
          speakingSkill: true,
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

// ─── Self-profile ──────────────────────────────────────────────────────────────

export async function getMyProfile(userId: string): Promise<MyProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      authProvider: true,
      createdAt: true,
      updatedAt: true,
      subscription: {
        select: { plan: true, status: true, currentPeriodEnd: true },
      },
      learnerProfile: {
        select: {
          id: true,
          currentLevel: true,
          targetLevel: true,
          learningPurpose: true,
          topicsOfInterest: true,
          aiPersonality: true,
          voiceSpeed: true,
          autoSpeak: true,
          uiLanguage: true,
          theme: true,
          weeklyGoalMinutes: true,
          timezone: true,
        },
      },
    },
  });

  if (!user) throw new AppError("User not found", 404);

  return user as MyProfile;
}

export async function updateMyProfile(
  userId: string,
  input: UpdateMyProfileInput,
): Promise<MyProfile> {
  await prisma.user.update({
    where: { id: userId },
    data: input,
  });

  return getMyProfile(userId);
}

export async function getDashboard(userId: string): Promise<DashboardData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();

  const [todayProgress, metrics, activeGoalsCount, vocabDueTodayCount, lastSession] =
    await Promise.all([
      // Today's progress row (or zeroed defaults if none yet)
      prisma.progress.findUnique({
        where: { userId_date: { userId, date: today } },
        select: {
          sessionsCount: true,
          studyMinutes: true,
          messagesCount: true,
          wordsTyped: true,
          vocabularyPracticed: true,
          goalsAdvanced: true,
        },
      }),
      // Lifetime metrics (upsert so it always exists)
      prisma.userMetrics.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: {
          currentStreak: true,
          longestStreak: true,
          totalStudyTimeMinutes: true,
          estimatedLevel: true,
          grammarSkill: true,
          vocabularySkill: true,
          fluencySkill: true,
          speakingSkill: true,
        },
      }),
      // Count of ACTIVE goals
      prisma.goal.count({ where: { userId, status: "ACTIVE" } }),
      // SRS cards due today
      prisma.vocabulary.count({ where: { userId, srsDue: { lte: now } } }),
      // Most recent session with evaluation summary
      prisma.conversationSession.findFirst({
        where: { userId },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          topic: true,
          endedAt: true,
          durationSeconds: true,
          evaluation: {
            select: {
              avgOverallScore: true,
              detectedCefrLevel: true,
            },
          },
        },
      }),
    ]);

  return {
    todayProgress: {
      sessionsCount: todayProgress?.sessionsCount ?? 0,
      studyMinutes: todayProgress?.studyMinutes ?? 0,
      messagesCount: todayProgress?.messagesCount ?? 0,
      wordsTyped: todayProgress?.wordsTyped ?? 0,
      vocabularyPracticed: todayProgress?.vocabularyPracticed ?? 0,
      goalsAdvanced: todayProgress?.goalsAdvanced ?? 0,
    },
    metrics: {
      currentStreak: metrics.currentStreak,
      longestStreak: metrics.longestStreak,
      totalStudyTimeMinutes: metrics.totalStudyTimeMinutes,
      estimatedLevel: metrics.estimatedLevel,
      grammarSkill: metrics.grammarSkill,
      vocabularySkill: metrics.vocabularySkill,
      fluencySkill: metrics.fluencySkill,
      speakingSkill: metrics.speakingSkill,
    },
    activeGoalsCount,
    vocabDueTodayCount,
    lastSession: lastSession
      ? {
          id: lastSession.id,
          topic: lastSession.topic,
          endedAt: lastSession.endedAt,
          durationSeconds: lastSession.durationSeconds,
          evaluation: lastSession.evaluation
            ? {
                avgOverallScore: lastSession.evaluation.avgOverallScore,
                detectedCefrLevel: lastSession.evaluation.detectedCefrLevel,
              }
            : null,
        }
      : null,
  };
}

export async function getMySubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      id: true,
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      paymentProvider: true,
      updatedAt: true,
    },
  });
  if (!sub) throw new AppError("Subscription not found", 404);
  return sub;
}

export async function updateMyLearnerProfile(
  userId: string,
  input: UpdateLearnerProfileInput,
): Promise<MyProfile["learnerProfile"]> {
  // Prisma requires Prisma.JsonNull (not plain null) for nullable JSON fields
  const topicsOfInterest =
    input.topicsOfInterest === null
      ? Prisma.JsonNull
      : input.topicsOfInterest === undefined
        ? undefined
        : input.topicsOfInterest;

  const data = { ...input, topicsOfInterest };

  const profile = await prisma.learnerProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: {
      id: true,
      currentLevel: true,
      targetLevel: true,
      learningPurpose: true,
      topicsOfInterest: true,
      aiPersonality: true,
      voiceSpeed: true,
      autoSpeak: true,
      uiLanguage: true,
      theme: true,
      weeklyGoalMinutes: true,
      timezone: true,
    },
  });

  return profile as MyProfile["learnerProfile"];
}
