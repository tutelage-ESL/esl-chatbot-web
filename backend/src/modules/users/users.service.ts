import { prisma } from "../../config/database.ts";
import type { UserListItem } from "./users.types.ts";

const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isActive: true,
  role: true,
  phoneNumber: true,
  email: true,
  createdAt: true,
} as const;

export async function getUsers(
  page: number,
  limit: number,
): Promise<{ users: UserListItem[]; total: number }> {
  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count(),
  ]);

  return { users, total };
}
