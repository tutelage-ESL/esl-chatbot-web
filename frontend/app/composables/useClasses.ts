import type {
  ClassItem,
  ClassDetail,
  AdminClassItem,
  ClassMember,
  ClassStudentSummary,
  ClassStudentDetail,
  ClassAnalytics,
  AnnouncementItem,
  ClassPaginationMeta,
} from '~/common/types/class-types'

export type { ClassItem, ClassDetail, AdminClassItem, ClassMember, ClassStudentSummary, ClassStudentDetail, ClassAnalytics, AnnouncementItem, ClassPaginationMeta }

// ─── Response wrappers ────────────────────────────────────────────────────────

interface ListResponse<T> { success: boolean; message?: string; data: T[] }
interface PaginatedResponse<T> { success: boolean; message?: string; data: T[]; meta: ClassPaginationMeta }
interface SingleResponse<T> { success: boolean; message?: string; data: T }

// ─── Composable ───────────────────────────────────────────────────────────────

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
    return await useHttp<SingleResponse<ClassDetail>>({
      method: 'POST',
      url: '/classes',
      body,
      requireAuth: true,
    })
  }

  async function updateClass(id: string, body: { className?: string; classCategory?: string | null; classStatus?: 'ACTIVE' | 'INACTIVE' }) {
    return await useHttp<SingleResponse<ClassDetail>>({
      method: 'PATCH',
      url: `/classes/${id}`,
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

  async function getClassStudents(classId: string) {
    return await useHttp<SingleResponse<ClassStudentSummary[]>>({
      method: 'GET',
      url: `/classes/${classId}/students`,
      requireAuth: true,
    })
  }

  async function getClassStudentDetail(classId: string, studentId: string) {
    return await useHttp<SingleResponse<ClassStudentDetail>>({
      method: 'GET',
      url: `/classes/${classId}/students/${studentId}`,
      requireAuth: true,
    })
  }

  async function getClassAnalytics(classId: string) {
    return await useHttp<SingleResponse<ClassAnalytics>>({
      method: 'GET',
      url: `/classes/${classId}/analytics`,
      requireAuth: true,
    })
  }

  async function removeMember(classId: string, userId: string) {
    return await useHttp({
      method: 'DELETE',
      url: `/classes/${classId}/members/${userId}`,
      requireAuth: true,
    })
  }

  async function listAnnouncements(classId: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return await useHttp<SingleResponse<{ data: AnnouncementItem[]; meta: ClassPaginationMeta }>>({
      method: 'GET',
      url: `/classes/${classId}/announcements${qs ? `?${qs}` : ''}`,
      requireAuth: true,
    })
  }

  async function createAnnouncement(classId: string, content: string) {
    return await useHttp<SingleResponse<AnnouncementItem>>({
      method: 'POST',
      url: `/classes/${classId}/announcements`,
      body: { content },
      requireAuth: true,
    })
  }

  return {
    listMyClasses,
    listAllClasses,
    getClass,
    joinClass,
    createClass,
    updateClass,
    refreshCode,
    updateCodeSettings,
    toggleBlock,
    getClassStudents,
    getClassStudentDetail,
    getClassAnalytics,
    removeMember,
    listAnnouncements,
    createAnnouncement,
  }
}
