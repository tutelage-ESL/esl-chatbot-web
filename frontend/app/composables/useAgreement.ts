import { useHttp } from '~/composables/useHttp'

interface AgreementContent {
  version: string
  effectiveDate: string
  text: string
}

// Module-scoped cache — one fetch shared across all components per page load.
const cached = ref<AgreementContent | null>(null)
const loading = ref(false)

export function useAgreement() {
  async function load(): Promise<AgreementContent | null> {
    if (cached.value || loading.value) return cached.value
    loading.value = true
    const res = await useHttp({ method: 'GET', url: '/auth/agreement', requireAuth: false })
    if (res.success && res.data?.data) {
      cached.value = res.data.data as AgreementContent
    }
    loading.value = false
    return cached.value
  }

  return { agreement: cached, loading, load }
}
