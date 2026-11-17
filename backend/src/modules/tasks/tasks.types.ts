export type TaskAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type TaskSubmissionItem = {
  id: string;
  taskId: string;
  studentId: string;
  content: string | null;
  fileUrl: string | null;
  feedback: string | null;
  feedbackAt: Date | null;
  student: TaskAuthor;
  /** Files handed in with the work; only the student and the class's tutors see them */
  attachments: TaskAttachmentItem[];
  createdAt: Date;
  updatedAt: Date;
};

export type TaskItem = {
  id: string;
  classId: string;
  createdById: string;
  title: string;
  description: string;
  deadline: Date | null;
  status: "OPEN" | "CLOSED";
  closedAt: Date | null;
  createdBy: TaskAuthor;
  submissionCount: number;
  commentsEnabled: boolean;
  commentCount: number;
  /** Files the tutor attached to the task itself (comment files are not included). */
  attachments: TaskAttachmentItem[];
  mySubmission?: TaskSubmissionItem | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskAttachmentItem = {
  id: string;
  taskId: string;
  commentId: string | null;
  submissionId: string | null;
  uploadedById: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  createdAt: Date;
};

/** The author's role in this class; ADMIN when an admin (not a member) wrote it. */
export type ClassActorRole = "TUTOR" | "STUDENT" | "ADMIN";

export type TaskCommentItem = {
  id: string;
  taskId: string;
  content: string | null;
  editedAt: Date | null;
  author: TaskAuthor & { classRole: ClassActorRole };
  attachments: TaskAttachmentItem[];
  createdAt: Date;
};
