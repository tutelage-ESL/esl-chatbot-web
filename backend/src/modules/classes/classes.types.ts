import type { ClassStatus, Role } from "@prisma/client";

export interface ClassListItem {
  id: string;
  className: string;
  classCode: string;
  classCategory: string | null;
  classStatus: ClassStatus;
  classCodeBlocked: boolean;
  classCodeExpiresAt: Date | null;
  classCodeRefreshIntervalSeconds: number | null;
  createdAt: Date;
  memberCount: number;
}

export interface ClassMember {
  id: string;
  role: Role;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface ClassDetail {
  id: string;
  className: string;
  classCode: string;
  classCategory: string | null;
  classStatus: ClassStatus;
  classCodeBlocked: boolean;
  classCodeExpiresAt: Date | null;
  classCodeRefreshIntervalSeconds: number | null;
  classCodeRefreshedAt: Date;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: ClassMember[];
}

/** Public-facing summary of the join code only — used by code-management endpoints. */
export interface ClassCodeInfo {
  classId: string;
  classCode: string;
  classCodeBlocked: boolean;
  classCodeExpiresAt: Date | null;
  classCodeRefreshIntervalSeconds: number | null;
  classCodeRefreshedAt: Date;
}

/** Result returned by the join-by-code endpoint. */
export interface JoinClassResult {
  classId: string;
  className: string;
  classCode: string;
  role: Role;
  joinedAt: Date;
}
