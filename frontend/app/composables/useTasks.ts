import type { TaskItem, TaskSubmissionItem, ClassPaginationMeta } from '~/common/types/task-types'

export type { TaskItem, TaskSubmissionItem }

// ─── Response wrappers ────────────────────────────────────────────────────────

interface SingleResponse<T> { success: boolean; message?: string; data: T }
interface ListResponse<T> { success: boolean; message?: string; data: T[] }
interface PaginatedResponse<T> {
  success: boolean
  message?: string
  data: T[]
  meta: ClassPaginationMeta
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useTasks() {

  async function listClassTasks(classId: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return await useHttp<PaginatedResponse<TaskItem>>({
      method: 'GET',
      url: `/classes/${classId}/tasks${qs ? `?${qs}` : ''}`,
      requireAuth: true,
    })
  }

  async function getTask(taskId: string) {
    return await useHttp<SingleResponse<TaskItem>>({
      method: 'GET',
      url: `/tasks/${taskId}`,
      requireAuth: true,
    })
  }

  async function createTask(classId: string, body: { title: string; description: string; deadline?: string | null }) {
    return await useHttp<SingleResponse<TaskItem>>({
      method: 'POST',
      url: `/classes/${classId}/tasks`,
      body,
      requireAuth: true,
    })
  }

  async function updateTask(taskId: string, body: { title?: string; description?: string; deadline?: string | null; closed?: boolean }) {
    return await useHttp<SingleResponse<TaskItem>>({
      method: 'PATCH',
      url: `/tasks/${taskId}`,
      body,
      requireAuth: true,
    })
  }

  async function deleteTask(taskId: string) {
    return await useHttp<{ success: boolean; message?: string }>({
      method: 'DELETE',
      url: `/tasks/${taskId}`,
      requireAuth: true,
    })
  }

  async function submitTask(taskId: string, body: { content?: string; fileUrl?: string }) {
    return await useHttp<SingleResponse<TaskSubmissionItem>>({
      method: 'POST',
      url: `/tasks/${taskId}/submissions`,
      body,
      requireAuth: true,
    })
  }

  async function listSubmissions(taskId: string) {
    return await useHttp<ListResponse<TaskSubmissionItem>>({
      method: 'GET',
      url: `/tasks/${taskId}/submissions`,
      requireAuth: true,
    })
  }

  async function giveFeedback(taskId: string, submissionId: string, feedback: string) {
    return await useHttp<SingleResponse<TaskSubmissionItem>>({
      method: 'PATCH',
      url: `/tasks/${taskId}/submissions/${submissionId}/feedback`,
      body: { feedback },
      requireAuth: true,
    })
  }

  return {
    listClassTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    submitTask,
    listSubmissions,
    giveFeedback,
  }
}
