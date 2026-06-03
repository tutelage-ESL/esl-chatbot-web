<script setup lang="ts">
defineProps<{
  label: string
  value: number | string
  icon?: string
  iconColor?: string
  /** 0–100 bar fill; when set, renders a progress bar under the row */
  pct?: number
  barColor?: string
  valueColor?: string
}>()
</script>

<template>
  <div class="p-3 rounded-xl" :style="`background:var(--surface-raised)`">
    <div class="flex items-center justify-between" :class="pct !== undefined ? 'mb-2' : ''">
      <div class="flex items-center gap-2.5 min-w-0">
        <AppIconsax v-if="icon" :name="icon as any" :color="iconColor ?? 'var(--color-brand-primary)'" :size="15" />
        <span class="text-[14px] font-medium font-poppins truncate" :style="`color:var(--text-body)`">{{ label }}</span>
      </div>
      <span class="text-[15px] font-bold font-poppins shrink-0" :style="`color:${valueColor ?? 'var(--text-heading)'}`">{{ value }}</span>
    </div>
    <div v-if="pct !== undefined" class="h-1.5 rounded-full overflow-hidden" :style="`background:var(--surface-page)`">
      <div class="h-full rounded-full transition-all duration-700" :style="`width:${pct}%;background:${barColor ?? 'var(--color-brand-primary)'}`" />
    </div>
  </div>
</template>
