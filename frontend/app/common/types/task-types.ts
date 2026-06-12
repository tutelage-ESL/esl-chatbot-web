import type { Task, TaskSubmission } from '~/common/model/task'
import type { User } from '~/common/model/user'
import type { ClassPaginationMeta } from '~/common/types/class-types'

export type { ClassPaginationMeta }

export type TaskAuthor = Pick<User, 'id' | 'displayName' | 'avatarUrl'>

export interface TaskSubmissionItem extends TaskSubmission {
  student: TaskAuthor
}

export interface TaskItem extends Task {
  createdBy: TaskAuthor
  /** Present for tutor/admin callers only */
  submissionCount?: number
  /** Present for student callers only; null = not yet submitted */
  mySubmission?: TaskSubmissionItem | null
}
