<script setup lang="ts">
import type { AdminDashboardData } from '~/common/types/admin-types'

const props = defineProps<{ stats: AdminDashboardData }>()

const total = computed(() => props.stats.users.total || 1)

function pct(n: number) {
  return Math.round((n / total.value) * 100)
}
</script>

<template>
  <div class="dash-card p-6">
    <p class="text-[18px] font-semibold font-poppins mb-5" :style="`color:var(--text-heading)`">Subscriptions</p>

    <div class="space-y-4">
      <!-- Free -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[14px] font-medium font-poppins" :style="`color:var(--text-heading)`">Free</span>
          <span class="text-[14px] font-semibold font-mono" :style="`color:var(--text-muted)`">
            {{ stats.subscriptions.FREE }} · {{ pct(stats.subscriptions.FREE) }}%
          </span>
        </div>
        <div class="h-2 rounded-full overflow-hidden" style="background:var(--surface-raised)">
          <div class="h-full rounded-full transition-all duration-500" style="background:var(--text-subtle)" :style="`width:${pct(stats.subscriptions.FREE)}%`" />
        </div>
      </div>

      <!-- Gold -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[14px] font-medium font-poppins text-amber-500">Gold</span>
          <span class="text-[14px] font-semibold font-mono" :style="`color:var(--text-muted)`">
            {{ stats.subscriptions.GOLD }} · {{ pct(stats.subscriptions.GOLD) }}%
          </span>
        </div>
        <div class="h-2 rounded-full overflow-hidden" style="background:var(--surface-raised)">
          <div class="h-full rounded-full bg-amber-500 transition-all duration-500" :style="`width:${pct(stats.subscriptions.GOLD)}%`" />
        </div>
      </div>

      <!-- Premium -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[14px] font-medium font-poppins text-violet-500">Premium</span>
          <span class="text-[14px] font-semibold font-mono" :style="`color:var(--text-muted)`">
            {{ stats.subscriptions.PREMIUM }} · {{ pct(stats.subscriptions.PREMIUM) }}%
          </span>
        </div>
        <div class="h-2 rounded-full overflow-hidden" style="background:var(--surface-raised)">
          <div class="h-full rounded-full bg-violet-500 transition-all duration-500" :style="`width:${pct(stats.subscriptions.PREMIUM)}%`" />
        </div>
      </div>
    </div>
  </div>
</template>
