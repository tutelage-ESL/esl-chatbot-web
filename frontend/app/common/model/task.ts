export type TaskStatus = 'OPEN' | 'CLOSED'

export type Task = {
  id: string
  classId: string
  createdById: string
  title: string
  description: string
  deadline: string | null
  status: TaskStatus
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TaskSubmission = {
  id: string
  taskId: string
  studentId: string
  content: string | null
  fileUrl: string | null
  feedback: string | null
  feedbackAt: string | null
  createdAt: string
  updatedAt: string
}
