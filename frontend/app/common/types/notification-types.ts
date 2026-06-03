export type { NotificationType, Notification } from '~/common/model/notification'

export interface NotificationPaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}
