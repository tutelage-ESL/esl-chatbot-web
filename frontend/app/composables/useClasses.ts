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

export interface AdminClassItem {
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
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ListResponse<T> {
  success: boolean
  message?: string
  data: T[]
}
interface PaginatedResponse<T> {
  success: boolean
  message?: string
  data: T[]
  meta: PaginationMeta
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

  async function listAllClasses(params?: { page?: number; limit?: number; status?: 'ACTIVE' | 'INACTIVE' }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.status) query.set('status', params.status)
    const qs = query.toString()
    return await useHttp<PaginatedResponse<AdminClassItem>>({
      method: 'GET',
      url: `/classes${qs ? `?${qs}` : ''}`,
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

  async function createClass(body: { className: string; classCategory?: string | null; classCodeRefreshIntervalSeconds?: number | null }) {
    return await useHttp({
      method: 'POST',
      url: '/classes',
      body,
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

  async function updateCodeSettings(id: string, intervalSeconds: number | null) {
    return await useHttp({
      method: 'PATCH',
      url: `/classes/${id}/code/settings`,
      body: { classCodeRefreshIntervalSeconds: intervalSeconds },
      requireAuth: true,
    })
  }

  async function toggleBlock(id: string, blocked: boolean) {
    return await useHttp({
      method: 'PATCH',
      url: `/classes/${id}/code/block`,
      body: { blocked },
      requireAuth: true,
    })
  }

  return { listMyClasses, listAllClasses, getClass, joinClass, createClass, refreshCode, updateCodeSettings, toggleBlock }
}
