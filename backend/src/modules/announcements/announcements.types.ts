export interface AnnouncementAttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface AnnouncementItem {
  id: string;
  classId: string;
  authorId: string;
  content: string;
  /** Students can comment only while this is on; tutors/admins always can */
  commentsEnabled: boolean;
  editedAt: Date | null;
  createdAt: Date;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  attachments: AnnouncementAttachmentItem[];
  commentCount: number;
}

export interface AnnouncementCommentItem {
  id: string;
  announcementId: string;
  content: string;
  editedAt: Date | null;
  createdAt: Date;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    /** Author's role in the class; ADMIN when an admin (not a member) wrote it */
    classRole: "TUTOR" | "STUDENT" | "ADMIN";
  };
}
