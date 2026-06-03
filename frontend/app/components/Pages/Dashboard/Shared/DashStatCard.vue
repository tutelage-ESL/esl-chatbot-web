<script setup lang="ts">
type Accent = 'default' | 'gold' | 'premium' | 'green'

const props = defineProps<{
  label: string
  value: string | number
  sub?: string
  icon: string
  accent?: Accent
}>()

// Single source of truth for accent colours — avoids nested ternaries in template.
const ACCENTS: Record<Accent, { bg: string; color: string }> = {
  default: { bg: 'var(--surface-raised)', color: 'var(--color-brand-primary)' },
  gold: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  premium: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  green: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
}

const tone = computed(() => ACCENTS[props.accent ?? 'default'])
</script>

<template>
  <div class="dash-card p-5 flex items-center gap-4">
    <div class="size-11 rounded-xl flex items-center justify-center shrink-0" :style="`background:${tone.bg}`">
      <AppIconsax :name="icon as any" :color="tone.color" :size="18" />
    </div>
    <div class="min-w-0">
      <p class="text-[13px] font-poppins uppercase tracking-wider font-semibold" :style="`color:var(--text-subtle)`">{{ label }}</p>
      <p class="text-[26px] font-bold font-poppins leading-tight" :style="`color:var(--text-heading)`">{{ value }}</p>
      <p v-if="sub" class="text-[13px] font-poppins mt-0.5" :style="`color:var(--text-muted)`">{{ sub }}</p>
    </div>
  </div>
</template>
