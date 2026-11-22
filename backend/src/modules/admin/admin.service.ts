import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import { Prisma, type PaymentProvider } from "@prisma/client";
import type { SubscriptionResult, AdminDashboardData } from "./admin.types.ts";
import type { UpdateUserBody, AssignSubscriptionBody, AdminUpdateProfileInput, AdminUpdateLearnerProfileInput } from "./admin.schema.ts";
import { uploadAvatar, deleteAvatar } from "../../config/storage.ts";
import { getMyProfile } from "../users/users.service.ts";
import { deleteCache, cacheKeys } from "../../config/cache.ts";

function computeEndDate(durationMonths: number): Date {
  // setUTCMonth avoids local-timezone overflow (e.g. Jan 31 + 1 month = Mar 3 in setMonth)
  const end = new Date();
  end.setUTCMonth(end.getUTCMonth() + durationMonths);
  return end;
}

// Maps validated string from schema to Prisma PaymentProvider enum value
function toPaymentProvider(value: PaymentProvider | undefined): PaymentProvider {
  return value ?? "CASH";
}

function isP2025(err: unknown): boolean {
  return (err as { code?: string }).code === "P2025";
}

// Internal (stealth) accounts must be indistinguishable from nonexistent users,
// even to admins — every admin mutation targeting one returns 404.
async function assertTargetNotInternal(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isInternal: true },
  });
  if (!user || user.isInternal) throw new AppError("User not found", 404);
}

export async function updateUser(id: string, data: UpdateUserBody, actorUserId: string) {
  const target = await prisma.user.findUnique({
    where: { id },
    select: { isInternal: true, role: true, isActive: true },
  });
  // Internal (stealth) targets are indistinguishable from nonexistent users.
  if (!target || target.isInternal) throw new AppError("User not found", 404);

  const demotingRole = data.role !== undefined && data.role !== "ADMIN";
  const deactivating = data.isActive === false;

  // Self-lockout guard: an admin must not be able to strip their own access,
  // which would instantly lock them out mid-request.
  if (actorUserId === id) {
    if (target.role === "ADMIN" && demotingRole) {
      throw new AppError("You cannot change your own admin role", 409);
    }
    if (deactivating) {
      throw new AppError("You cannot deactivate your own account", 409);
    }
  }

  // Last-admin guard: never let the final active (non-internal) admin be demoted
  // or deactivated — that would leave the platform with no usable admin and force
  // another raw-SQL bootstrap. Stealth admins are intentionally not counted here,
  // so the org always keeps at least one visible admin.
  if (target.role === "ADMIN" && (demotingRole || deactivating)) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, isInternal: false, id: { not: id } },
    });
    if (otherActiveAdmins === 0) {
      throw new AppError("Cannot remove the last active admin", 409);
    }
  }

  try {
    const result = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isActive: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      },
    });
    // role or isActive change must be visible immediately on next page load
    await deleteCache(cacheKeys.authUser(id));
    return result;
  } catch (err) {
    if (isP2025(err)) throw new AppError("User not found", 404);
    throw err;
  }
}

export async function assignSubscription(
  userId: string,
  data: AssignSubscriptionBody,
): Promise<SubscriptionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isInternal: true },
  });
  if (!user || user.isInternal) throw new AppError("User not found", 404);

  const now = new Date();
  const isPaidPlan = data.plan !== "FREE";

  // FREE plan is permanent — no period dates needed
  const currentPeriodStart = isPaidPlan ? now : null;
  const currentPeriodEnd = isPaidPlan
    ? (data.endDate ? new Date(data.endDate) : computeEndDate(data.durationMonths!))
    : null;

  const paymentProvider = toPaymentProvider(data.paymentProvider);

  const result = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: data.plan,
      status: "ACTIVE",
      currentPeriodStart,
      currentPeriodEnd,
      paymentProvider,
    },
    update: {
      plan: data.plan,
      status: "ACTIVE",
      currentPeriodStart,
      currentPeriodEnd,
      paymentProvider,
      externalCustomerId: null,
      externalSubscriptionId: null,
    },
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

  await deleteCache(cacheKeys.authUser(userId));
  return result;
}

export async function cancelSubscription(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isInternal: true, emailVerified: true, subscription: { select: { id: true } } },
  });
  if (!user || user.isInternal) throw new AppError("User not found", 404);
  if (!user.subscription) throw new AppError("User has no subscription to cancel", 404);

  // Downgrade to FREE — ACTIVE (AI at FREE limits) only once the user has verified;
  // an unverified account goes back to INACTIVE, exactly like a fresh sign-up.
  // To block all access, use PATCH /admin/users/:id with isActive=false instead.
  await prisma.subscription.update({
    where: { userId },
    data: {
      plan: "FREE",
      status: user.emailVerified ? "ACTIVE" : "INACTIVE",
      currentPeriodEnd: null,
      currentPeriodStart: null,
      paymentProvider: null,
      externalCustomerId: null,
      externalSubscriptionId: null,
    },
  });

  await deleteCache(cacheKeys.authUser(userId));
}

export async function adminUpdateProfile(userId: string, input: AdminUpdateProfileInput) {
  await assertTargetNotInternal(userId);
  await prisma.user.update({ where: { id: userId }, data: input });
  await deleteCache(cacheKeys.authUser(userId));
  return getMyProfile(userId);
}

export async function adminUploadAvatar(userId: string, buffer: Buffer, mimeType: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isInternal: true, avatarUrl: true },
  });
  if (!user || user.isInternal) throw new AppError("User not found", 404);
  if (user.avatarUrl) {
    try { await deleteAvatar(user.avatarUrl); } catch {}
  }
  const avatarUrl = await uploadAvatar(buffer, userId, mimeType);
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  await deleteCache(cacheKeys.authUser(userId));
  return { avatarUrl };
}

export async function adminUpdateLearnerProfile(userId: string, input: AdminUpdateLearnerProfileInput) {
  await assertTargetNotInternal(userId);

  // Prisma requires Prisma.JsonNull (not plain null) for nullable JSON fields
  const topicsOfInterest =
    input.topicsOfInterest === null
      ? Prisma.JsonNull
      : input.topicsOfInterest;

  const data = { ...input, topicsOfInterest };

  const profile = await prisma.learnerProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  await deleteCache(cacheKeys.dashboard(userId));
  return profile;
}
