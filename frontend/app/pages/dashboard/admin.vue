<script setup lang="ts">
import { useAdmin } from '~/composables/useAdmin'
import type { AdminDashboardData } from '~/common/types/admin-types'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const { getDashboardStats } = useAdmin()
const stats = ref<AdminDashboardData | null>(null)
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  const res = await getDashboardStats()
  if (res.success && res.data?.data) stats.value = res.data.data
  loading.value = false
})
</script>

<template>
  <div class="h-full overflow-y-auto p-5 sm:p-7 space-y-5">

    <div class="animate-card-enter" style="--delay:0ms">
      <h1 class="text-[28px] font-semibold tracking-[-0.02em] font-poppins" :style="`color:var(--text-heading)`">Platform Dashboard</h1>
      <p class="text-[14px] mt-1 font-poppins" :style="`color:var(--text-muted)`">Real-time platform health overview.</p>
    </div>

    <div v-if="loading" class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-card-enter" style="--delay:80ms">
      <UiSkeleton v-for="n in 8" :key="n" class="h-28 rounded-2xl" />
    </div>

    <template v-else-if="stats">
      <div class="animate-card-enter" style="--delay:80ms">
        <PagesDashboardAdminKpiCards :stats="stats" />
      </div>
      <div class="grid md:grid-cols-2 gap-4 animate-card-enter" style="--delay:160ms">
        <PagesDashboardAdminSubscriptionBreakdown :stats="stats" />
        <PagesDashboardAdminRevenuePanel :stats="stats" />
      </div>
      <div class="animate-card-enter" style="--delay:240ms">
        <PagesDashboardAdminUsersByRole :stats="stats" />
      </div>
    </template>

  </div>
</template>
