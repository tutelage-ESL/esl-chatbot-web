import type { SessionListItem } from '~/common/types/chat-types'

export interface ClassMember {
  id: string
  role: 'STUDENT' | 'TUTOR' | 'ADMIN'
  user: { id: string; username: string; displayName: string; avatarUrl: string | null }
}

export interface ClassItem {
  id: string
  className: string
  classCode: string
  classCategory: string | null
  classStatus: 'ACTIVE' | 'INACTIVE'
  classCodeBlocked: boolean
  classCodeExpiresAt: string | null
  classCodeRefreshIntervalSeconds: number | null
  createdAt: string
  memberCount: number
  myRole?: 'STUDENT' | 'TUTOR' | 'ADMIN'
}

export interface ClassDetail extends ClassItem {
  members: ClassMember[]
}

interface ListResponse<T> {
  success: boolean
  message?: string
  data: T[]
}
interface SingleResponse<T> {
  success: boolean
  message?: string
  data: T
}

export function useClasses() {
  async function listMyClasses() {
    return await useHttp<ListResponse<ClassItem>>({
      method: 'GET',
      url: '/classes/mine',
      requireAuth: true,
    })
  }

  async function getClass(id: string) {
    return await useHttp<SingleResponse<ClassDetail>>({
      method: 'GET',
      url: `/classes/${id}`,
      requireAuth: true,
    })
  }

  async function joinClass(classCode: string) {
    return await useHttp<SingleResponse<{ classId: string; className: string; classCode: string; role: string; joinedAt: string }>>({
      method: 'POST',
      url: '/classes/join',
      body: { classCode },
      requireAuth: true,
    })
  }

  async function refreshCode(id: string) {
    return await useHttp<SingleResponse<{ classCode: string; classCodeExpiresAt: string | null }>>({
      method: 'POST',
      url: `/classes/${id}/code/refresh`,
      requireAuth: true,
    })
  }

  return { listMyClasses, getClass, joinClass, refreshCode }
}
