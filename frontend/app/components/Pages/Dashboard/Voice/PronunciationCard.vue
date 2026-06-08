<script setup lang="ts">
import type { VoicePronunciation } from '~/common/types/voice-types'

const props = defineProps<{
  available: boolean // GOLD/PREMIUM only
  pronunciation: VoicePronunciation | null
}>()

const metrics = computed(() => {
  const p = props.pronunciation
  if (!p) return []
  const out = [
    { label: 'Accuracy', value: p.accuracyScore },
    { label: 'Fluency', value: p.fluencyScore },
    { label: 'Complete', value: p.completenessScore },
  ]
  if (p.prosodyScore != null) out.push({ label: 'Prosody', value: p.prosodyScore })
  return out
})

function toneColor(v: number) {
  if (v >= 85) return 'var(--status-active-text)'
  if (v >= 70) return 'var(--color-brand-primary)'
  return 'var(--status-expired-text)'
}

// circumference for a 30px-radius ring
const C = 2 * Math.PI * 30
function dash(v: number) {
  return `${(v / 100) * C} ${C}`
}
</script>

<template>
  <div class="dash-card p-5">
    <div class="flex items-center justify-between">
      <AppText size="11" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.18em] font-poppins">
        Pronunciation
      </AppText>

      <!-- FREE: explain why it's locked on hover -->
      <UiPopover v-if="!available">
        <UiPopoverTrigger as-child>
          <button class="flex items-center gap-1.5 rounded-md bg-surface-raised px-2 py-1 transition hover:bg-brand-primary/10">
            <AppIconsax name="Lock1" color="var(--color-text-subtle)" :size="13" />
            <span class="text-[12px] font-medium text-text-muted font-poppins">GOLD</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="end" class="w-64">
          <div class="flex items-start gap-2">
            <AppIconsax name="InfoCircle" color="var(--color-brand-primary)" :size="16" class="mt-0.5 shrink-0" />
            <p class="text-[13px] leading-relaxed text-text-body font-poppins">
              Per-word pronunciation scoring runs on Azure speech assessment, included with
              <span class="font-semibold text-text-heading">GOLD</span> and
              <span class="font-semibold text-text-heading">PREMIUM</span>. Your conversation,
              transcript, and grammar scores stay fully available on your plan.
            </p>
          </div>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- ── PAID, has data ───────────────────────────────────────── -->
    <template v-if="available && pronunciation">
      <div class="mt-4 grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-4">
        <div v-for="m in metrics" :key="m.label" class="flex flex-col items-center">
          <div class="relative size-[72px]">
            <svg class="size-full -rotate-90" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="var(--surface-raised)" stroke-width="6" />
              <circle
                cx="36" cy="36" r="30" fill="none"
                :stroke="toneColor(m.value)" stroke-width="6" stroke-linecap="round"
                :stroke-dasharray="dash(m.value)"
                class="transition-[stroke-dasharray] duration-700 ease-out"
              />
            </svg>
            <span class="absolute inset-0 flex items-center justify-center font-poppins text-[16px] font-semibold text-text-heading">
              {{ Math.round(m.value) }}
            </span>
          </div>
          <span class="mt-1.5 text-[12px] text-text-muted font-poppins">{{ m.label }}</span>
        </div>
      </div>

      <!-- Per-word issues -->
      <div v-if="pronunciation.issues.length" class="mt-5 border-t border-border-inner pt-4">
        <AppText size="12" weight="semibold" color="neutral-400" class-list="mb-2 font-poppins block">
          Words to work on
        </AppText>
        <div class="space-y-2">
          <div
            v-for="(issue, i) in pronunciation.issues.slice(0, 5)"
            :key="i"
            class="rounded-lg border border-border-inner bg-surface-raised px-3 py-2"
          >
            <div class="flex items-center justify-between">
              <span class="text-[14px] font-semibold text-text-heading font-poppins">{{ issue.word }}</span>
              <span class="text-[11px] text-text-subtle font-poppins">{{ issue.issue }}</span>
            </div>
            <p class="mt-0.5 text-[12px] text-text-muted font-poppins">{{ issue.suggestion }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- ── PAID, awaiting first turn ────────────────────────────── -->
    <div v-else-if="available" class="mt-6 flex flex-col items-center py-6 text-center">
      <div class="flex size-12 items-center justify-center rounded-full bg-surface-raised">
        <AppIconsax name="Microphone2" color="var(--color-text-subtle)" :size="22" />
      </div>
      <AppText size="13" color="neutral-400" class-list="mt-3 max-w-52 font-poppins">
        Speak a turn and your per-word pronunciation breakdown lands here.
      </AppText>
    </div>

    <!-- ── FREE: locked upsell ──────────────────────────────────── -->
    <div v-else class="mt-4">
      <!-- ghosted preview rings -->
      <div class="grid grid-cols-4 gap-2 opacity-40 blur-[1px]" aria-hidden="true">
        <div v-for="n in 4" :key="n" class="flex flex-col items-center">
          <div class="size-[72px] rounded-full border-[6px] border-surface-raised" />
        </div>
      </div>
      <div class="mt-4 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4">
        <div class="flex items-center gap-2">
          <AppIconsax name="Crown1" color="var(--color-brand-primary)" :size="15" />
          <AppText size="14" weight="semibold" color="brand-ink" class-list="font-poppins">
            Hear exactly how you sound
          </AppText>
        </div>
        <AppText size="13" color="neutral-400" class-list="mt-1 font-poppins block">
          Upgrade to GOLD for word-level accuracy, fluency, and prosody scoring on every spoken turn.
        </AppText>
        <AppButton
          to="/dashboard/billing"
          variant="primary"
          size="36"
          radius="8"
          icon="Crown1"
          :icon-config="{ color: 'white' }"
          text="Upgrade to GOLD"
          class="mt-3"
        />
      </div>
    </div>
  </div>
</template>
