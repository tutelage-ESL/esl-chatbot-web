<script setup lang="ts">
import type { Goal, Achievement } from '~/common/types/dashboard-types'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const goals: Goal[] = [
  { title: 'Read 2 English novels',              progress: 60, due: 'end of April', current: '1.2 / 2 books' },
  { title: 'Hold a 30-min conversation on travel', progress: 80, due: 'this week',   current: '22 / 30 min' },
  { title: 'Reach C1 level',                     progress: 62, due: 'by October',   current: 'B2 → C1 (62%)' },
  { title: 'Learn 500 business words',           progress: 28, due: 'ongoing',      current: '142 / 500' },
]

const achievements: Achievement[] = [
  { title: 'Week streak',   description: '7 days in a row',      icon: 'Flash',       earned: true },
  { title: 'Month warrior', description: '30 days in a row',     icon: 'Cup',         earned: false, progress: 23 },
  { title: 'Chatterbox',    description: '100 sessions',         icon: 'Messages',    earned: true },
  { title: 'Polyglot',      description: '1000 words',           icon: 'Book1',       earned: true },
  { title: 'Perfect pitch', description: '90%+ on 10 prompts',  icon: 'Microphone',  earned: false, progress: 70 },
  { title: 'Dedication',    description: '100 hours',            icon: 'Clock',       earned: false, progress: 42 },
]
</script>

<template>
  <div class="p-5 sm:p-7 space-y-5">
    <!-- Header -->
    <div class="animate-card-enter" style="--delay:0ms">
      <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-brand-ink dark:text-white font-poppins">Goals</h1>
      <p class="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1 font-poppins">Targets you set. Progress we measure.</p>
    </div>

    <!-- Goal cards grid -->
    <div class="grid md:grid-cols-2 gap-4">
      <DashboardGoalsGoalCard
        v-for="(goal, i) in goals"
        :key="goal.title"
        :goal="goal"
        :delay="80 + i * 60"
      />
    </div>

    <!-- Achievements -->
    <DashboardGoalsAchievementGrid :achievements="achievements" />
  </div>
</template>
