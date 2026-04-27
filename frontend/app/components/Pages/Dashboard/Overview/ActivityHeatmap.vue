<script setup lang="ts">
import type { HeatWeek, RecentSession } from '~/common/types/dashboard-types'

defineProps<{
  heatData: HeatWeek[]
  activePct: number
  recentSessions: RecentSession[]
}>()

function heatColor(n: number): string {
  if (n === 0) return 'bg-zinc-100 dark:bg-white/4'
  if (n <= 2)  return 'bg-brand-primary/25'
  if (n <= 4)  return 'bg-brand-primary/50'
  if (n <= 5)  return 'bg-brand-primary/70'
  return 'bg-brand-primary'
}

const heatLegend = [0, 2, 3, 5, 7]
</script>

<template>
  <div class="dash-card p-5">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <AppText size="10" color="neutral-400" weight="semibold" uppercase class="tracking-[0.18em] font-poppins">
          Practice consistency
        </AppText>
        <div class="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400 font-poppins">
          12 weeks · <span class="text-brand-primary font-medium">{{ activePct }}%</span> of days active
        </div>
      </div>
      <div class="flex items-center gap-1.5 text-[10px] text-zinc-400 font-poppins">
        Less
        <div class="flex gap-1">
          <span
            v-for="n in heatLegend"
            :key="n"
            :class="['w-2.5 h-2.5 rounded-[3px]', heatColor(n)]"
          />
        </div>
        More
      </div>
    </div>

    <!-- Heatmap grid -->
    <div class="mt-4 flex gap-1.5 overflow-x-auto pb-1">
      <!-- Day labels -->
      <div class="flex flex-col gap-1.5 text-[10px] text-zinc-400 font-mono shrink-0 pr-1 pt-3">
        <span>Mon</span>
        <span style="margin-top:11px">Wed</span>
        <span style="margin-top:11px">Fri</span>
      </div>
      <!-- Weeks -->
      <div
        v-for="(week, wi) in heatData"
        :key="wi"
        class="flex flex-col gap-1.5 shrink-0"
      >
        <span
          v-for="(n, di) in week"
          :key="di"
          :class="['w-4.5 h-4.5 rounded', heatColor(n)]"
          :title="`${n} sessions`"
        />
      </div>
    </div>

    <!-- Divider + recent sessions -->
    <div class="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
      <AppText size="10" color="neutral-400" weight="semibold" uppercase class="tracking-[0.18em] font-poppins">
        Recent sessions
      </AppText>
      <button class="text-[11px] font-medium text-brand-primary font-poppins hover:underline">View all</button>
    </div>

    <div class="mt-2 divide-y divide-black/4 dark:divide-white/4">
      <div
        v-for="session in recentSessions"
        :key="session.topic"
        class="flex items-center gap-3 py-2.5"
      >
        <div class="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
          <AppIconsax :name="session.icon as any" color="currentColor" :size="14" />
        </div>
        <div class="flex-1 min-w-0">
          <AppText size="12" weight="medium" color="brand-ink" class="truncate font-poppins">{{ session.topic }}</AppText>
          <AppText size="10" color="neutral-400" class="font-poppins">{{ session.type }} · {{ session.meta }}</AppText>
        </div>
        <AppText size="10" color="neutral-400" class="font-mono shrink-0">{{ session.time }}</AppText>
      </div>
    </div>
  </div>
</template>
