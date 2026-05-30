import type { Goal, GoalType, GoalStatus, GoalDifficulty } from '~/common/model/goal'

export type { Goal, GoalType, GoalStatus, GoalDifficulty }

export interface CreateGoalInput {
  type: GoalType
  description: string
  target: number
  difficulty?: GoalDifficulty
  targetDate?: string
  actionPlan?: string
}

export interface UpdateGoalInput {
  description?: string
  target?: number
  difficulty?: GoalDifficulty | null
  status?: GoalStatus
  progress?: number
  targetDate?: string | null
  actionPlan?: string | null
}

export function useGoals() {
  const goals = ref<Goal[]>([])
  const total = ref(0)
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  // ── Filters ────────────────────────────────────────────────────────────────
  const filterStatus = ref<GoalStatus | ''>('')
  const filterType = ref<GoalType | ''>('')

  // ── Fetch list ─────────────────────────────────────────────────────────────
  async function fetchGoals() {
    loading.value = true
    error.value = null
    const params = new URLSearchParams({ limit: '50' })
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterType.value) params.set('type', filterType.value)

    const res = await useHttp<{ success: boolean; message: string; data: Goal[] }>({
      method: 'GET',
      url: `/goals?${params.toString()}`,
      requireAuth: true,
      showToast: false,
    })
    if (res.success && res.data?.data) {
      goals.value = res.data.data
      total.value = goals.value.length
    } else {
      error.value = res.data?.message ?? res.message ?? 'Failed to load goals'
    }
    loading.value = false
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async function createGoal(input: CreateGoalInput): Promise<boolean> {
    submitting.value = true
    const res = await useHttp<{ success: boolean; message: string; data: Goal }>({
      method: 'POST',
      url: '/goals',
      body: input,
      requireAuth: true,
      showToast: true,
    })
    submitting.value = false
    if (res.success && res.data?.data) {
      goals.value.unshift(res.data.data)
      total.value++
      return true
    }
    return false
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async function updateGoal(id: string, input: UpdateGoalInput): Promise<boolean> {
    submitting.value = true
    const res = await useHttp<{ success: boolean; message: string; data: Goal }>({
      method: 'PATCH',
      url: `/goals/${id}`,
      body: input,
      requireAuth: true,
      showToast: true,
    })
    submitting.value = false
    if (res.success && res.data?.data) {
      const idx = goals.value.findIndex((g) => g.id === id)
      if (idx !== -1) goals.value[idx] = res.data.data
      return true
    }
    return false
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function deleteGoal(id: string): Promise<boolean> {
    const res = await useHttp<{ success: boolean; message: string; data: null }>({
      method: 'DELETE',
      url: `/goals/${id}`,
      requireAuth: true,
      showToast: true,
    })
    if (res.success) {
      goals.value = goals.value.filter((g) => g.id !== id)
      total.value--
      return true
    }
    return false
  }

  // ── Computed stats ─────────────────────────────────────────────────────────
  const activeGoals = computed(() => goals.value.filter((g) => g.status === 'ACTIVE'))
  const completedGoals = computed(() => goals.value.filter((g) => g.status === 'COMPLETED'))
  const pausedGoals = computed(() => goals.value.filter((g) => g.status === 'PAUSED'))

  return {
    goals,
    total,
    loading,
    submitting,
    error,
    filterStatus,
    filterType,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    activeGoals,
    completedGoals,
    pausedGoals,
  }
}
