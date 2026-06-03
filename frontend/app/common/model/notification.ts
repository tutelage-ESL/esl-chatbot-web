export type NotificationType =
  | 'STREAK_MILESTONE'
  | 'GOAL_COMPLETED'
  | 'GOAL_ASSIGNED'
  | 'CLASS_ANNOUNCEMENT'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  read: boolean
  createdAt: string
}
