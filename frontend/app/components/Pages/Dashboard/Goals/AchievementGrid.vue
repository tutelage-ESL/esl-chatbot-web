<script setup lang="ts">
import type { Goal } from '~/common/model/goal'

const props = defineProps<{
  goals: Goal[]
  streak?: number
  totalStudyMinutes?: number
  totalSessions?: number
  totalWords?: number
}>()

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earned: boolean
  progress: number // 0–100
}

const achievements = computed((): Achievement[] => {
  const completedCount = props.goals.filter((g) => g.status === 'COMPLETED').length
  const activeCount = props.goals.filter((g) => g.status === 'ACTIVE').length
  const streak = props.streak ?? 0
  const studyHours = Math.round((props.totalStudyMinutes ?? 0) / 60)
  const sessions = props.totalSessions ?? 0
  const words = props.totalWords ?? 0

  return [
    {
      id: 'week-streak',
      title: '7-day streak',
      description: '7 days in a row',
      icon: 'Flash',
      earned: streak >= 7,
      progress: Math.min(100, Math.round((streak / 7) * 100)),
    },
    {
      id: 'month-streak',
      title: 'Month warrior',
      description: '30 days in a row',
      icon: 'Cup',
      earned: streak >= 30,
      progress: Math.min(100, Math.round((streak / 30) * 100)),
    },
    {
      id: 'chatterbox',
      title: 'Chatterbox',
      description: '100 sessions',
      icon: 'Messages',
      earned: sessions >= 100,
      progress: Math.min(100, Math.round((sessions / 100) * 100)),
    },
    {
      id: 'polyglot',
      title: 'Polyglot',
      description: '1 000 words',
      icon: 'Book1',
      earned: words >= 1000,
      progress: Math.min(100, Math.round((words / 1000) * 100)),
    },
    {
      id: 'dedicated',
      title: 'Dedication',
      description: '100 hours',
      icon: 'Clock',
      earned: studyHours >= 100,
      progress: Math.min(100, Math.round((studyHours / 100) * 100)),
    },
    {
      id: 'goal-crusher',
      title: 'Goal crusher',
      description: '5 goals done',
      icon: 'Flag',
      earned: completedCount >= 5,
      progress: Math.min(100, Math.round((completedCount / 5) * 100)),
    },
  ]
})

const earnedCount = computed(() => achievements.value.filter((a) => a.earned).length)
</script>

<template>
  <div class="dash-card p-5 animate-card-enter" style="--delay:320ms">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <p class="text-[11px] uppercase tracking-[0.18em] text-text-muted font-semibold font-poppins">Achievements</p>
        <p class="mt-0.5 text-[13px] text-text-body font-poppins">
          <span class="text-brand-primary font-semibold">{{ earnedCount }}</span>
          <span class="text-text-muted"> of {{ achievements.length }} unlocked</span>
        </p>
      </div>
      <!-- Overall progress bar -->
      <div class="w-28">
        <div class="h-1.5 rounded-full bg-surface-raised overflow-hidden">
          <div
            class="h-full bg-linear-to-r from-brand-primary to-brand-accent rounded-full transition-all duration-700"
            :style="`width:${Math.round((earnedCount / achievements.length) * 100)}%`"
          />
        </div>
        <p class="text-[10px] text-text-subtle text-right mt-1 font-mono">
          {{ Math.round((earnedCount / achievements.length) * 100) }}%
        </p>
      </div>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div
        v-for="(a, i) in achievements"
        :key="a.id"
        :class="[
          'p-4 rounded-xl border text-center relative overflow-hidden animate-card-enter transition-all duration-200',
          a.earned
            ? 'bg-linear-to-br from-brand-primary/10 to-transparent border-brand-primary/25 hover:-translate-y-0.5'
            : 'bg-surface-raised/50 border-border-inner',
        ]"
        :style="`--delay:${400 + i * 60}ms`"
      >
        <!-- Glow for earned -->
        <div
          v-if="a.earned"
          class="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-brand-primary/20 blur-xl pointer-events-none"
        />

        <!-- Icon -->
        <div
          :class="[
            'w-10 h-10 mx-auto rounded-full flex items-center justify-center relative',
            a.earned
              ? 'bg-brand-primary shadow-[0_4px_12px_rgba(245,158,11,0.35)]'
              : 'bg-surface-well',
          ]"
        >
          <AppIconsax
            :name="a.icon as any"
            :color="a.earned ? '#000' : 'var(--color-text-subtle)'"
            :size="16"
          />
          <!-- Lock overlay for unearned -->
          <div
            v-if="!a.earned"
            class="absolute inset-0 flex items-end justify-end pr-0.5 pb-0.5"
          >
            <AppIconsax name="Lock" color="var(--color-text-subtle)" :size="9" />
          </div>
        </div>

        <p :class="['mt-2 text-[12px] font-semibold font-poppins', a.earned ? 'text-text-heading' : 'text-text-muted']">
          {{ a.title }}
        </p>
        <p class="text-[10px] text-text-subtle font-poppins mt-0.5">{{ a.description }}</p>

        <!-- Progress bar for unearned -->
        <div v-if="!a.earned" class="mt-2.5 h-1 rounded-full bg-surface-well overflow-hidden">
          <div
            class="h-full bg-brand-primary/50 rounded-full animate-fill-bar"
            :style="`width:${a.progress}%; --delay:${600 + i * 60}ms`"
          />
        </div>
        <p v-if="!a.earned" class="text-[9px] text-text-subtle font-mono mt-0.5">{{ a.progress }}%</p>
      </div>
    </div>
  </div>
</template>
