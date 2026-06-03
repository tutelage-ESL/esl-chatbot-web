<script setup lang="ts">
const {
  loading,
  fetchTutorDashboard,
  classes,
  students,
  skills,
  sessionsToday,
  recentActivity,
} = useTutorDashboard()

onMounted(fetchTutorDashboard)

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

const statCards = computed(() => [
  { label: 'Classes', value: classes.value.total, sub: `${classes.value.active} active`, icon: 'BookSaved', accent: 'default' as const },
  { label: 'Students', value: students.value.total, sub: `${students.value.activeToday} active today`, icon: 'People', accent: 'green' as const },
  { label: 'Weekly active', value: students.value.activeThisWeek, sub: `of ${students.value.total} students`, icon: 'Activity', accent: 'premium' as const },
  { label: 'Sessions today', value: sessionsToday.value, sub: 'Across all students', icon: 'Messages', accent: 'gold' as const },
])

const skillBars = computed(() => [
  { label: 'Grammar', value: skills.value.avgGrammar, color: '#f59e0b' },
  { label: 'Vocabulary', value: skills.value.avgVocabulary, color: '#8b5cf6' },
  { label: 'Fluency', value: skills.value.avgFluency, color: '#22c55e' },
  { label: 'Speaking', value: skills.value.avgSpeaking, color: '#06b6d4' },
])
</script>

<template>
  <div class="h-full overflow-y-auto p-5 sm:p-7 space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between gap-4 flex-wrap animate-card-enter" style="--delay:0ms">
      <div>
        <p class="text-[24px] font-bold font-poppins" :style="`color:var(--text-heading)`">Tutor Dashboard</p>
        <p class="text-[14px] font-poppins mt-0.5" :style="`color:var(--text-muted)`">{{ today }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <AppButton variant="secondary" size="36" radius="8" icon="BookSaved" text="My classes" @click="$router.push('/dashboard/classes')" />
        <AppButton variant="primary" size="36" radius="8" icon="Add" text="Create class" :icon-config="{ color: 'white', size: 15 }" @click="$router.push('/dashboard/classes/create')" />
      </div>
    </div>

    <!-- Stat cards row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-card-enter" style="--delay:80ms">
      <template v-if="loading">
        <UiSkeleton v-for="n in 4" :key="n" class="h-24 rounded-xl" />
      </template>
      <template v-else>
        <PagesDashboardSharedDashStatCard
          v-for="card in statCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :sub="card.sub"
          :icon="card.icon"
          :accent="card.accent"
        />
      </template>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

      <!-- Avg skill scores -->
      <div class="lg:col-span-2">
        <PagesDashboardSharedDashSectionCard
          title="Avg class skills"
          icon="Chart"
          to="/dashboard/classes"
          link-label="View class analytics"
          :delay="160"
        >
          <template v-if="loading">
            <UiSkeleton v-for="n in 4" :key="n" class="h-12 rounded-xl" />
          </template>
          <template v-else>
            <PagesDashboardSharedDashBreakdownRow
              v-for="bar in skillBars"
              :key="bar.label"
              :label="bar.label"
              :value="`${bar.value}%`"
              :pct="bar.value"
              :bar-color="bar.color"
            />
          </template>
        </PagesDashboardSharedDashSectionCard>
      </div>

      <!-- Recent student activity -->
      <div class="lg:col-span-3">
        <PagesDashboardSharedDashSectionCard
          title="Recent student activity"
          icon="Activity"
          :to="recentActivity.length ? '/dashboard/classes' : undefined"
          link-label="View all classes"
          :delay="220"
        >
          <template v-if="loading">
            <UiSkeleton v-for="n in 5" :key="n" class="h-14 rounded-xl" />
          </template>
          <template v-else-if="recentActivity.length === 0">
            <UiEmpty class="py-6">
              <UiEmptyMedia>
                <AppIconsax name="Activity" color="var(--color-text-subtle)" :size="30" />
              </UiEmptyMedia>
              <UiEmptyContent>
                <UiEmptyTitle>No student activity yet</UiEmptyTitle>
                <UiEmptyDescription>Create a class and invite students to get started.</UiEmptyDescription>
              </UiEmptyContent>
              <AppButton variant="primary" size="32" radius="8" icon="Add" text="Create a class" :icon-config="{ color: 'white', size: 13 }" @click="$router.push('/dashboard/classes/create')" />
            </UiEmpty>
          </template>
          <template v-else>
            <PagesDashboardTutorTutorActivityRow
              v-for="item in recentActivity"
              :key="`${item.userId}-${item.startedAt}`"
              :item="item"
            />
          </template>
        </PagesDashboardSharedDashSectionCard>
      </div>

    </div>

  </div>
</template>
