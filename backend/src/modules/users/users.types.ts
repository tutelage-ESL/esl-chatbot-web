import type { Role } from "@prisma/client";

export interface UserListItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  role: Role;
  phoneNumber: string | null;
  createdAt: Date;
}

export interface GetUsersQuery {
  page?: string;
  limit?: string;
}
