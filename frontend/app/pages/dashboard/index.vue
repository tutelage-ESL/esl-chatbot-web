<script setup lang="ts">
import type {
  StatCard,
  ChartPoint,
  UpcomingLesson,
  RecentSession,
  DueWord,
  HeatWeek,
} from '~/common/types/dashboard-types'

definePageMeta({
  layout: 'dashboard',
  requiresAuth: true,
})

const router = useRouter()

const stats: StatCard[] = [
  { label: 'Words mastered', value: '1,248', delta: '+42 this week',  icon: 'Book1' },
  { label: 'Practice time',  value: '42h',   delta: 'this month',     icon: 'Clock' },
  { label: 'Pronunciation',  value: '92%',   delta: '+4% vs last',    icon: 'Microphone' },
  { label: 'Current level',  value: 'B2',    delta: '62% to C1',      icon: 'Star1' },
]

const chartPoints: ChartPoint[] = [
  { label: 'Mar 14', value: 8  },
  { label: 'Mar 21', value: 14 },
  { label: 'Mar 28', value: 20 },
  { label: 'Apr 4',  value: 30 },
  { label: 'Apr 11', value: 42 },
  { label: 'Apr 18', value: 56 },
]

const recommended: UpcomingLesson = {
  title: 'Small-talk in professional settings',
  tag: 'Business', minutes: 15, level: 'B2', icon: 'Messages',
}

const upcomingLessons: UpcomingLesson[] = [
  { title: 'Job interview vocabulary',    tag: 'Business', minutes: 15, level: 'B2', icon: 'Book1' },
  { title: 'Past perfect in conversation', tag: 'Grammar', minutes: 12, level: 'B1', icon: 'Candle' },
]

const heatData: HeatWeek[] = Array.from({ length: 12 }, (_, wk) =>
  Array.from({ length: 7 }, (_, d) => {
    const r = Math.sin(wk * 1.3 + d * 0.7) * 3 + 3 + (wk > 6 ? 1 : 0)
    return Math.max(0, Math.min(7, Math.floor(r)))
  }),
)

const recentSessions: RecentSession[] = [
  { type: 'Chat',  topic: 'Weekend plans',     time: '8 min ago',  meta: '12 turns · 94%',    icon: 'Messages' },
  { type: 'Voice', topic: 'Pronunciation: TH', time: '2 hrs ago',  meta: '82% accuracy',      icon: 'Microphone' },
  { type: 'SRS',   topic: 'Vocabulary review', time: 'Yesterday',  meta: '24 cards · +8 new', icon: 'Book1' },
  { type: 'Chat',  topic: 'Travel in Europe',  time: '2 days ago', meta: '26 turns · 88%',    icon: 'Messages' },
]

const dueWords: DueWord[] = [
  { word: 'ambiguous',  meaning: 'unclear or open to multiple meanings', due: 'now' },
  { word: 'meticulous', meaning: 'showing great attention to detail',    due: 'in 1h' },
  { word: 'resilient',  meaning: 'able to recover quickly',              due: 'in 3h' },
  { word: 'nuance',     meaning: 'a subtle difference in meaning',       due: 'tomorrow' },
]
</script>

<template>
  <div class="p-5 sm:p-7 space-y-5">
    <!-- Greeting hero — delay 0 -->
    <div class="animate-card-enter" style="--delay:0ms">
      <DashboardOverviewGreetingHero
        :streak="23"
        :done-mins="17"
        :goal-mins="25"
        @nav-chat="router.push('/dashboard/chat')"
        @nav-voice="router.push('/dashboard/voice')"
        @nav-vocab="router.push('/dashboard/vocab')"
      />
    </div>

    <!-- Stat cards row — staggered -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="(card, i) in stats"
        :key="card.label"
        class="animate-card-enter"
        :style="`--delay:${80 + i * 60}ms`"
      >
        <DashboardOverviewStatCard :card="card" />
      </div>
    </div>

    <!-- Chart + Next up — delay 320ms -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 animate-card-enter" style="--delay:320ms">
        <DashboardOverviewVocabChart
          :points="chartPoints"
          :total-words="1248"
          growth="+12.4%"
        />
      </div>
      <div class="animate-card-enter" style="--delay:380ms">
        <DashboardOverviewNextUp
          :recommended="recommended"
          :upcoming="upcomingLessons"
          @start-lesson="router.push('/dashboard/chat')"
        />
      </div>
    </div>

    <!-- Heatmap + Due words — delay 440ms -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 animate-card-enter" style="--delay:440ms">
        <DashboardOverviewActivityHeatmap
          :heat-data="heatData"
          :active-pct="78"
          :recent-sessions="recentSessions"
        />
      </div>
      <div class="animate-card-enter" style="--delay:500ms">
        <DashboardOverviewDueWords
          :words="dueWords"
          :total-due="12"
          :level-pct="62"
          @start-review="router.push('/dashboard/vocab')"
        />
      </div>
    </div>
  </div>
</template>
