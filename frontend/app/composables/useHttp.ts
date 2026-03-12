import { useAuthStore } from '~~/stores/auth'
import { toast } from 'vue-sonner'

type HttpOptions = {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'
  baseUrl?: string
  url: string
  body?: any
  requireAuth?: boolean
  headers?: Record<string, string>
  showToast?: boolean
  includeCredentials?: boolean
  ignoreResponse?: boolean
}

type HttpResponse<T = any> = {
  success: boolean
  message: string
  data: T | null
  status? : number
}

export const useHttp = async <T = any>(options: HttpOptions): Promise<HttpResponse<T>> => {
  const config = useRuntimeConfig()
  const { baseUrl ,url, method, body, requireAuth = false, headers, showToast = false, includeCredentials = false, ignoreResponse = false } = options

  const BASE_URL = config.app.baseURL || ''

  let API_URL = options.url
  if(url){
    API_URL = url.startsWith('/') ? url : `/${url}`
  }
  
  let finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    "Accept-Language": "en",
    ...(headers || {}),
  }

  if (requireAuth) {
    let token = useAuthStore().getAccessToken || localStorage.getItem('accessToken') || useCookie('accessToken').value;
    
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  try {
    const res = await fetch(`${baseUrl ? baseUrl : BASE_URL}${API_URL}`, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: includeCredentials ? 'include' : 'same-origin',
    })
    

    if (res.status === 401) {
      useAuthStore().isTokenRefreshed = false; 
      return await refreshTokenHandler({
        baseUrl,
        BASE_URL,
        API_URL,
        method,
        body,
        finalHeaders,
        includeCredentials,
        showToast,
        ignoreResponse,
      });
    }

    if (!res.ok) {
      const data = await res.json()
      const response = { success: false, message: data.error?.message || data.message || `Request failed: ${res.status}`, data: null, status: res.status }
      showToastHandler(response.success, response.message, showToast)
      return response
    }

    if (res.ok && ignoreResponse) {
      const response = { success: true, message: 'Success', data: null, status: res.status }
      return response
    }

    const data = await res.json()
    const response = { success: true, message: data.message || 'Success', data, status: res.status }
    showToastHandler(response.success, response.message, showToast && !!data.message)
    return response
  } catch (error: any) {
    const response = { success: false, message: error.message || 'Network error occurred', data: null, status: error.status || 500 }
    showToastHandler(response.success, response.message, showToast)
    return response
  }
};


const showToastHandler = (success: boolean, message: string, showToast: boolean) => {
  if (!showToast) return
  if (!success) return toast.error(message)
  toast.success(message)
};

const refreshTokenHandler = async ({
  baseUrl,
  BASE_URL,
  API_URL,
  method,
  body,
  finalHeaders,
  includeCredentials,
  showToast,
  ignoreResponse,
}: {
  baseUrl?: string;
  BASE_URL: string;
  API_URL: string;
  method: string;
  body?: any;
  finalHeaders: Record<string, string>;
  includeCredentials: boolean;
  showToast: boolean;
  ignoreResponse: boolean;
}): Promise<HttpResponse<any>> => {


  // Try to refresh token
  const refreshSuccess = await useAuthStore().refreshTokens();

  if (refreshSuccess) {
    // Retry the request with new token
    const newToken = useAuthStore().getAccessToken || localStorage.getItem('accessToken');
    if (newToken) {
      finalHeaders['Authorization'] = `Bearer ${newToken}`;

      const retryRes = await fetch(`${baseUrl ? baseUrl : BASE_URL}${API_URL}`, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: includeCredentials ? 'include' : 'same-origin',
      });

      if (!retryRes.ok) {
        const data = await retryRes.json();
        const response = { success: false, message: data.error?.message || `Request failed: ${retryRes.status}`, data: null, status: retryRes.status };
        showToastHandler(response.success, response.message, showToast);
        return response;
      }

      if (retryRes.ok) {
        if (ignoreResponse) {
          return { success: true, message: 'Success', data: null, status: retryRes.status };
        }
        const retryData = await retryRes.json();
        return { success: true, message: retryData.message || 'Success', data: retryData, status: retryRes.status };
      }
    }
  }

  // If refresh failed, user is already logged out by refreshTokens()
  await useAuthStore().signOut();
  const response = { success: false, message: 'Session expired. Please login again.', data: null, status: 401 };
  showToastHandler(response.success, response.message, showToast);
  return response;
};