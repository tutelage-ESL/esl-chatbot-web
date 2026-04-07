import type { ClassStatus, Role } from "@prisma/client";

export interface ClassListItem {
  id: string;
  className: string;
  classCode: string;
  classCategory: string | null;
  classStatus: ClassStatus;
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
  createdAt: Date;
  updatedAt: Date;
  members: ClassMember[];
}
