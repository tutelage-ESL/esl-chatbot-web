<script setup lang="ts">
import type { Goal } from '~/common/types/dashboard-types'
defineProps<{ goal: Goal; delay?: number }>()
</script>

<template>
  <div
    class="dash-card p-5 animate-card-enter"
    :style="`--delay:${delay ?? 0}ms`"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[16px] font-semibold tracking-tight text-brand-ink dark:text-white font-poppins">{{ goal.title }}</p>
        <p class="text-[11.5px] text-zinc-400 mt-0.5 font-poppins">Due {{ goal.due }} · {{ goal.current }}</p>
      </div>
      <p class="text-[22px] font-semibold tracking-tight text-brand-ink dark:text-white shrink-0 font-poppins">
        {{ goal.progress }}<span class="text-[12px] text-zinc-400">%</span>
      </p>
    </div>
    <div class="mt-3 h-2 rounded-full bg-zinc-100 dark:bg-white/5 overflow-hidden">
      <div
        class="h-full bg-linear-to-r from-brand-primary to-brand-accent rounded-full animate-fill-bar"
        :style="`width:${goal.progress}%; --delay:${(delay ?? 0) + 200}ms`"
      />
    </div>
  </div>
</template>
