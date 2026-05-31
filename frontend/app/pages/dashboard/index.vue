<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  requiresAuth: true,
})

const router = useRouter()

const {
  loading,
  fetchOverview,
  greetingHeroProps,
  dueVocabCount,
  statCards,
  vocabChartPoints,
  vocabChartTotal,
  vocabChartGrowth,
  nextUpPrimary,
  nextUpOthers,
  heatData,
  activePct,
  recentSessions,
  dueWords,
  totalDue,
  levelPct,
} = useDashboardOverview()

onMounted(fetchOverview)
</script>

<template>
  <div class="h-full overflow-y-auto p-5 sm:p-7 space-y-5">

    <!-- Greeting hero — delay 0 -->
    <div class="animate-card-enter" style="--delay:0ms">
      <UiSkeleton v-if="loading" class="h-44 w-full rounded-2xl" />
      <PagesDashboardOverviewGreetingHero
        v-else
        :streak="greetingHeroProps.streak"
        :done-mins="greetingHeroProps.doneMins"
        :goal-mins="greetingHeroProps.goalMins"
        :due-vocab-count="dueVocabCount"
        @nav-chat="router.push('/dashboard/chat')"
        @nav-voice="router.push('/dashboard/voice')"
        @nav-vocab="router.push('/dashboard/vocab')"
      />
    </div>

    <!-- Stat cards row — staggered -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <template v-if="loading">
        <UiSkeleton v-for="n in 4" :key="n" class="h-24 rounded-xl" />
      </template>
      <template v-else>
        <div
          v-for="(card, i) in statCards"
          :key="card.label"
          class="animate-card-enter"
          :style="`--delay:${80 + i * 60}ms`"
        >
          <PagesDashboardOverviewStatCard :card="card" />
        </div>
      </template>
    </div>

    <!-- Chart + Heatmap (left 2/3) + Next up + Due words (right 1/3) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Left column: spans 2, two cards stacked -->
      <div class="lg:col-span-2 flex flex-col gap-4">
        <div class="animate-card-enter" style="--delay:320ms">
          <UiSkeleton v-if="loading" class="h-64 rounded-xl" />
          <PagesDashboardOverviewVocabChart
            v-else
            :points="vocabChartPoints"
            :total-words="vocabChartTotal"
            :growth="vocabChartGrowth"
          />
        </div>
        <div class="animate-card-enter" style="--delay:440ms">
          <UiSkeleton v-if="loading" class="h-72 rounded-xl" />
          <PagesDashboardOverviewActivityHeatmap
            v-else
            :heat-data="heatData"
            :active-pct="activePct"
            :recent-sessions="recentSessions"
          />
        </div>
      </div>
      <!-- Right column: spans 1, two cards stacked -->
      <div class="flex flex-col gap-4">
        <div class="animate-card-enter" style="--delay:380ms">
          <UiSkeleton v-if="loading" class="h-64 rounded-xl" />
          <PagesDashboardOverviewNextUp
            v-else
            :recommended="nextUpPrimary ?? { title: 'No active goals yet', tag: '—', minutes: 0, level: '—', icon: 'Flag' }"
            :upcoming="nextUpOthers"
            @start-lesson="router.push('/dashboard/goals')"
          />
        </div>
        <div class="animate-card-enter" style="--delay:500ms">
          <UiSkeleton v-if="loading" class="h-72 rounded-xl" />
          <PagesDashboardOverviewDueWords
            v-else
            :words="dueWords"
            :total-due="totalDue"
            :level-pct="levelPct"
            @start-review="router.push('/dashboard/vocab')"
          />
        </div>
      </div>
    </div>

  </div>
</template>
