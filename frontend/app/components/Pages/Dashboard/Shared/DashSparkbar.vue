<script setup lang="ts">
/**
 * Horizontal bar chart — used for skill scores, user-role counts etc.
 * Each bar label + value + coloured fill, no external library.
 */
defineProps<{
  bars: Array<{ label: string; value: number; max?: number; color: string; suffix?: string }>
  /** Show the numeric value on the right. Default true. */
  showValue?: boolean
}>()
</script>

<template>
  <div class="space-y-3">
    <div v-for="bar in bars" :key="bar.label" class="space-y-1.5">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[14px] font-medium font-poppins" :style="`color:var(--text-body)`">{{ bar.label }}</span>
        <span v-if="showValue !== false" class="text-[14px] font-bold font-poppins shrink-0" :style="`color:var(--text-heading)`">
          {{ bar.value }}{{ bar.suffix ?? '' }}
        </span>
      </div>
      <div class="h-2 rounded-full overflow-hidden" :style="`background:var(--surface-raised)`">
        <div
          class="h-full rounded-full transition-all duration-700"
          :style="`width:${bar.max ? Math.round((bar.value / bar.max) * 100) : bar.value}%;background:${bar.color}`"
        />
      </div>
    </div>
  </div>
</template>
