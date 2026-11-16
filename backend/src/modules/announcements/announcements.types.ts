export interface AnnouncementItem {
  id: string;
  classId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}
