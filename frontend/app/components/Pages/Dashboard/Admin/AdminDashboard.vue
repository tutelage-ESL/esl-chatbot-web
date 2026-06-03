<script setup lang="ts">
const {
  loading,
  fetchAdminDashboard,
  totalUsers,
  usersByRole,
  subscriptions,
  activeUsers,
  sessionsToday,
  revenueByProvider,
} = useAdminDashboard()

onMounted(fetchAdminDashboard)

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

const paidTotal = computed(() => (subscriptions.value.GOLD ?? 0) + (subscriptions.value.PREMIUM ?? 0))

function pctOfUsers(n: number): number {
  return totalUsers.value ? Math.round((n / totalUsers.value) * 100) : 0
}

// Engagement rate — how much of the user base was active in the last week.
const weeklyEngagement = computed(() => pctOfUsers(activeUsers.value.weekly))

// Users-by-role rows
const ROLE_ICON: Record<'STUDENT' | 'TUTOR' | 'ADMIN', string> = {
  STUDENT: 'People',
  TUTOR: 'Teacher',
  ADMIN: 'Shield',
}
const roleRows = computed(() =>
  (['STUDENT', 'TUTOR', 'ADMIN'] as const).map((role) => ({
    role,
    label: `${role.charAt(0)}${role.slice(1).toLowerCase()}s`,
    count: usersByRole.value[role] ?? 0,
    icon: ROLE_ICON[role],
  }))
)

// Subscription rows with fill %
const planRows = computed(() => [
  { label: 'Free', value: subscriptions.value.FREE, pct: pctOfUsers(subscriptions.value.FREE), barColor: 'var(--color-text-subtle)', valueColor: 'var(--text-heading)' },
  { label: 'Gold', value: subscriptions.value.GOLD, pct: pctOfUsers(subscriptions.value.GOLD), barColor: '#f59e0b', valueColor: '#f59e0b' },
  { label: 'Premium', value: subscriptions.value.PREMIUM, pct: pctOfUsers(subscriptions.value.PREMIUM), barColor: '#8b5cf6', valueColor: '#8b5cf6' },
])

const revenueRows = computed(() =>
  Object.entries(revenueByProvider.value).map(([provider, count]) => ({ provider, count }))
)
</script>

<template>
  <div class="h-full overflow-y-auto p-5 sm:p-7 space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between gap-4 flex-wrap animate-card-enter" style="--delay:0ms">
      <div>
        <p class="text-[24px] font-bold font-poppins" :style="`color:var(--text-heading)`">Admin Dashboard</p>
        <p class="text-[14px] font-poppins mt-0.5" :style="`color:var(--text-muted)`">{{ today }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <AppButton variant="secondary" size="36" radius="8" icon="People" text="Manage users" @click="$router.push('/dashboard/users')" />
        <AppButton variant="primary" size="36" radius="8" icon="BookSaved" text="Manage classes" :icon-config="{ color: 'white', size: 15 }" @click="$router.push('/dashboard/classes/manage')" />
      </div>
    </div>

    <!-- Top stat cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-card-enter" style="--delay:80ms">
      <template v-if="loading">
        <UiSkeleton v-for="n in 4" :key="n" class="h-24 rounded-xl" />
      </template>
      <template v-else>
        <PagesDashboardSharedDashStatCard label="Total users" :value="totalUsers" :sub="`${usersByRole.STUDENT} students · ${usersByRole.TUTOR} tutors`" icon="People" />
        <PagesDashboardSharedDashStatCard label="Paid subscribers" :value="paidTotal" :sub="`${subscriptions.GOLD} Gold · ${subscriptions.PREMIUM} Premium`" icon="Crown1" accent="gold" />
        <PagesDashboardSharedDashStatCard label="Active today" :value="activeUsers.daily" :sub="`${weeklyEngagement}% active this week`" icon="Activity" accent="green" />
        <PagesDashboardSharedDashStatCard label="Sessions today" :value="sessionsToday" sub="Across all users" icon="Messages" accent="premium" />
      </template>
    </div>

    <!-- Breakdown cards -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

      <!-- Users by role -->
      <PagesDashboardSharedDashSectionCard
        title="Users by role"
        icon="People"
        to="/dashboard/users"
        link-label="Manage all users"
        :delay="160"
      >
        <template v-if="loading">
          <UiSkeleton v-for="n in 3" :key="n" class="h-12 rounded-xl" />
        </template>
        <template v-else>
          <NuxtLink
            v-for="row in roleRows"
            :key="row.role"
            :to="`/dashboard/users?role=${row.role}`"
            class="block transition-opacity hover:opacity-80"
          >
            <PagesDashboardSharedDashBreakdownRow :label="row.label" :value="row.count" :icon="row.icon" />
          </NuxtLink>
        </template>
      </PagesDashboardSharedDashSectionCard>

      <!-- Active subscriptions -->
      <PagesDashboardSharedDashSectionCard
        title="Active subscriptions"
        icon="Card"
        to="/dashboard/users?subscriptionStatus=ACTIVE"
        link-label="View active subscribers"
        :delay="220"
      >
        <template v-if="loading">
          <UiSkeleton v-for="n in 3" :key="n" class="h-14 rounded-xl" />
        </template>
        <template v-else>
          <PagesDashboardSharedDashBreakdownRow
            v-for="plan in planRows"
            :key="plan.label"
            :label="plan.label"
            :value="plan.value"
            :pct="plan.pct"
            :bar-color="plan.barColor"
            :value-color="plan.valueColor"
          />
        </template>
      </PagesDashboardSharedDashSectionCard>

      <!-- Revenue by provider -->
      <PagesDashboardSharedDashSectionCard
        title="Active paid by provider"
        icon="Wallet2"
        :delay="280"
      >
        <template v-if="loading">
          <UiSkeleton v-for="n in 3" :key="n" class="h-12 rounded-xl" />
        </template>
        <template v-else-if="revenueRows.length === 0">
          <UiEmpty class="py-6">
            <UiEmptyMedia>
              <AppIconsax name="Wallet2" color="var(--color-text-subtle)" :size="28" />
            </UiEmptyMedia>
            <UiEmptyContent>
              <UiEmptyTitle>No paid subscriptions</UiEmptyTitle>
              <UiEmptyDescription>Assign a plan to a user to see revenue here.</UiEmptyDescription>
            </UiEmptyContent>
          </UiEmpty>
        </template>
        <template v-else>
          <PagesDashboardSharedDashBreakdownRow
            v-for="row in revenueRows"
            :key="row.provider"
            :label="row.provider"
            :value="row.count"
            icon="Wallet2"
          />
        </template>
      </PagesDashboardSharedDashSectionCard>

    </div>

  </div>
</template>
