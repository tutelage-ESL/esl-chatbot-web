<script setup lang="ts">
import type { VoiceEvaluation } from '~/common/types/voice-types'

const props = defineProps<{ evaluation: VoiceEvaluation | null }>()

const metrics = computed(() => {
  const e = props.evaluation
  return [
    { label: 'Grammar', value: e?.grammarScore ?? null },
    { label: 'Vocabulary', value: e?.vocabularyScore ?? null },
    { label: 'Fluency', value: e?.fluencyScore ?? null },
  ]
})

const overall = computed(() => props.evaluation ? Math.round(props.evaluation.overallScore) : null)
const cefr = computed(() => props.evaluation?.detectedCefrLevel ?? '—')

function barColor(v: number) {
  if (v >= 85) return 'var(--status-active-text)'
  if (v >= 70) return 'var(--color-brand-primary)'
  return 'var(--status-expired-text)'
}
</script>

<template>
  <div class="dash-card p-5">
    <div class="flex items-center justify-between">
      <AppText size="11" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.18em] font-poppins">
        Last turn
      </AppText>
      <span
        v-if="evaluation"
        class="rounded-md bg-surface-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-text-body"
      >CEFR {{ cefr }}</span>
    </div>

    <!-- Overall score -->
    <div class="mt-2 flex items-baseline gap-2">
      <span class="font-poppins text-[44px] font-semibold leading-none tracking-[-0.03em] text-text-heading">
        {{ overall ?? '—' }}
      </span>
      <span class="font-poppins text-[14px] text-text-subtle">/ 100</span>
    </div>
    <AppText size="13" :color="overall == null ? 'neutral-400' : 'brand-primary'" weight="medium" class-list="mt-0.5 font-poppins block">
      {{ overall == null ? 'Speak a turn to get scored' : 'Overall spoken score' }}
    </AppText>

    <!-- Sub-metrics -->
    <div class="mt-5 space-y-3">
      <div v-for="m in metrics" :key="m.label">
        <div class="mb-1 flex justify-between font-poppins text-[13px]">
          <span class="text-text-muted">{{ m.label }}</span>
          <span class="font-medium text-text-heading">{{ m.value == null ? '—' : Math.round(m.value) }}</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-surface-raised">
          <div
            class="h-full rounded-full transition-[width] duration-500 ease-out"
            :style="{ width: `${m.value ?? 0}%`, background: m.value == null ? 'transparent' : barColor(m.value) }"
          />
        </div>
      </div>
    </div>

    <!-- Coach feedback -->
    <div v-if="evaluation?.feedback" class="mt-5 rounded-xl border border-border-inner bg-surface-raised p-3">
      <div class="mb-1 flex items-center gap-1.5">
        <AppIconsax name="Magicpen" color="var(--color-brand-primary)" :size="12" />
        <AppText size="11" weight="semibold" color="brand-primary" :uppercase="true" class-list="tracking-wider font-poppins">
          Coach note
        </AppText>
      </div>
      <p class="text-[13px] leading-relaxed text-text-body font-poppins">{{ evaluation.feedback }}</p>
    </div>
  </div>
</template>
