export type NotificationType =
  | 'STREAK_MILESTONE'
  | 'GOAL_COMPLETED'
  | 'GOAL_ASSIGNED'
  | 'VOCABULARY_ASSIGNED'
  | 'CLASS_ANNOUNCEMENT'
  | 'TASK_ASSIGNED'
  | 'TASK_SUBMITTED'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  read: boolean
  createdAt: string
}
