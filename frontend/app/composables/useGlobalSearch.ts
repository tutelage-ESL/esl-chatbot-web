import type { GlobalSearchResults } from '~/common/types/search-types'

interface SingleResponse<T> { success: boolean; message?: string; data: T }

/**
 * Raw API layer for the role-aware global search (`GET /search?q=`).
 * The backend scopes results by role — the frontend just renders the groups.
 */
export function useGlobalSearch() {
  function search(q: string) {
    return useHttp<SingleResponse<GlobalSearchResults>>({
      method: 'GET',
      url: `/search?q=${encodeURIComponent(q)}`,
      requireAuth: true,
      showToast: false,
    })
  }

  return { search }
}
