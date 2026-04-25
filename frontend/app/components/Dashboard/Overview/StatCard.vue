<script setup lang="ts">
import type { StatCard } from '~/common/types/dashboard-types'
defineProps<{ card: StatCard }>()
</script>

<template>
  <div class="dash-card p-4">
    <div class="flex items-center justify-between">
      <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">{{ card.label }}</p>
      <AppIconsax :name="card.icon as any" color="#d4d4d8" :size="13" />
    </div>
    <p class="mt-2 text-[26px] font-semibold tracking-[-0.02em] text-brand-ink dark:text-white font-poppins">{{ card.value }}</p>
    <p class="text-[11px] text-zinc-400 mt-0.5 font-mono">{{ card.delta }}</p>
  </div>
</template>
