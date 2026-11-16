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
  mySubmission?: TaskSubmissionItem | null;
  createdAt: Date;
  updatedAt: Date;
};
