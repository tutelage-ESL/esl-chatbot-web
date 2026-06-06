export type Class = {
  id: string;
  className: string;
  classCode: string;
  classCategory: string | null;
  classStatus: 'ACTIVE' | 'INACTIVE';
  archived: boolean;
  archivedAt: string | null;
  classCodeBlocked: boolean;
  classCodeExpiresAt: string | null;
  classCodeRefreshIntervalSeconds: number | null;
  classCodeRefreshedAt: string | null;
  createdById: string | null;
  createdAt: string;
  joinedAt: string;
  updatedAt: string;
};

export type ClassUser = {
  id: string;
  classId: string;
  userId: string;
  role: 'STUDENT' | 'TUTOR';
  joinedAt: string;
};

export type Announcement = {
  id: string;
  classId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};
