import { toast } from 'vue-sonner'
import { useAuthStore } from '~~/stores/auth';

type HttpOptions = {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'
  baseUrl?: string
  url: string
  body?: any
  requireAuth?: boolean
  headers?: Record<string, string>
  showToast?: boolean
  toastDelayMs?: number
  includeCredentials?: boolean
  ignoreResponse?: boolean
}

type HttpResponse<T = any> = {
  success: boolean
  message: string
  data: T | null
  status?: number
}

const BASE_URL = 'http://localhost:8000/api/v1'

function buildHeaders(requireAuth: boolean, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': 'en',
    ...(extra || {}),
  }
  if (requireAuth) {
    const store = useAuthStore()
    const token =
      store.getAccessToken ||
      (import.meta.client ? localStorage.getItem('accessToken') : null) ||
      useCookie('accessToken').value
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function executeRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: any,
  includeCredentials: boolean
): Promise<Response> {
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: includeCredentials ? 'include' : 'same-origin',
  })
}

function showToastHandler(success: boolean, message: string, showToast: boolean) {
  if (!showToast || !import.meta.client) return
  if (!success) toast.error(message)
  else toast.success(message)
}

async function waitForToast(showToast: boolean, delayMs: number) {
  if (!showToast || !import.meta.client) return
  if (!Number.isFinite(delayMs) || delayMs <= 0) return
  await new Promise((r) => setTimeout(r, delayMs))
}

async function parseResponse<T>(res: Response, ignoreResponse: boolean): Promise<HttpResponse<T>> {
  if (ignoreResponse) return { success: true, message: 'Success', data: null, status: res.status }
  const data = await res.json()
  return { success: true, message: data.message || 'Success', data, status: res.status }
}

export const useHttp = async <T = any>(options: HttpOptions): Promise<HttpResponse<T>> => {
  const {
    baseUrl,
    url,
    method,
    body,
    requireAuth = false,
    headers: extraHeaders,
    showToast = false,
    toastDelayMs = 0,
    includeCredentials = false,
    ignoreResponse = false,
  } = options

  const apiUrl = `${baseUrl ?? BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
  const headers = buildHeaders(requireAuth, extraHeaders)

  try {
    const res = await executeRequest(apiUrl, method, headers, body, includeCredentials)

    if (res.status === 401) {
      // Attempt token refresh once, then retry the original request
      const refreshed = await useAuthStore().refreshTokens()
      if (!refreshed) {
        const response: HttpResponse<T> = {
          success: false,
          message: 'Session expired. Please log in again.',
          data: null,
          status: 401,
        }
        showToastHandler(response.success, response.message, showToast)
        await waitForToast(showToast, toastDelayMs)
        return response
      }

      // Rebuild headers with the fresh token and retry
      const retryHeaders = buildHeaders(requireAuth, extraHeaders)
      const retryRes = await executeRequest(apiUrl, method, retryHeaders, body, includeCredentials)

      if (!retryRes.ok) {
        const data = await retryRes.json()
        const response: HttpResponse<T> = {
          success: false,
          message: data.error?.message || data.message || `Request failed: ${retryRes.status}`,
          data: null,
          status: retryRes.status,
        }
        showToastHandler(response.success, response.message, showToast)
        await waitForToast(showToast, toastDelayMs)
        return response
      }

      const response = await parseResponse<T>(retryRes, ignoreResponse)
      showToastHandler(response.success, response.message, showToast)
      await waitForToast(showToast, toastDelayMs)
      return response
    }

    if (!res.ok) {
      const data = await res.json()
      const response: HttpResponse<T> = {
        success: false,
        message: data.error?.message || data.message || `Request failed: ${res.status}`,
        data: null,
        status: res.status,
      }
      showToastHandler(response.success, response.message, showToast)
      await waitForToast(showToast, toastDelayMs)
      return response
    }

    const response = await parseResponse<T>(res, ignoreResponse)
    showToastHandler(response.success, response.message, showToast)
    await waitForToast(showToast, toastDelayMs)
    return response

  } catch (error: any) {
    const response: HttpResponse<T> = {
      success: false,
      message: error.message || 'Network error occurred',
      data: null,
      status: error.status || 500,
    }
    showToastHandler(response.success, response.message, showToast)
    await waitForToast(showToast, toastDelayMs)
    return response
  }
}
