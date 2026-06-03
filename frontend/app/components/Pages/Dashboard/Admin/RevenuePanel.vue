<script setup lang="ts">
import type { AdminDashboardData } from '~/common/types/admin-types'

const props = defineProps<{ stats: AdminDashboardData }>()

const providers = computed(() => Object.entries(props.stats.revenueByProvider))
</script>

<template>
  <div class="dash-card p-6">
    <p class="text-[18px] font-semibold font-poppins mb-5" :style="`color:var(--text-heading)`">Revenue by provider</p>

    <div v-if="providers.length" class="space-y-1">
      <div
        v-for="[provider, count] in providers"
        :key="provider"
        class="flex items-center justify-between py-3"
        style="border-bottom:1px solid var(--border-inner)"
      >
        <div class="flex items-center gap-3">
          <div class="size-9 rounded-xl flex items-center justify-center" style="background:var(--surface-raised)">
            <AppIconsax name="Wallet2" color="var(--color-brand-primary)" :size="16" />
          </div>
          <p class="text-[15px] font-semibold font-poppins" :style="`color:var(--text-heading)`">{{ provider }}</p>
        </div>
        <p class="text-[16px] font-semibold font-mono" style="color:var(--color-brand-primary)">
          {{ count }} active
        </p>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-10 gap-2">
      <div class="size-12 rounded-2xl flex items-center justify-center" style="background:var(--surface-raised)">
        <AppIconsax name="Wallet2" color="var(--color-text-subtle)" :size="24" />
      </div>
      <p class="text-[15px] font-semibold font-poppins" :style="`color:var(--text-heading)`">No paid subscriptions</p>
      <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">Revenue will appear here once users upgrade.</p>
    </div>
  </div>
</template>
