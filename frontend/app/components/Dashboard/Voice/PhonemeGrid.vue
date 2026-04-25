<script setup lang="ts">
import type { PhonemeScore } from '~/common/types/dashboard-types'

defineProps<{ phonemes: PhonemeScore[] }>()

function toneClasses(score: number) {
  if (score >= 90) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5'
  if (score >= 80) return 'text-brand-primary border-brand-primary/30 bg-brand-primary/5'
  return 'text-rose-500 border-rose-500/30 bg-rose-500/5'
}
</script>

<template>
  <div class="dash-card p-5">
    <div class="flex items-center justify-between mb-3">
      <p class="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">Word-level breakdown</p>
      <p class="text-[10.5px] text-zinc-400 font-poppins">Click any word for phoneme view</p>
    </div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
      <div
        v-for="(p, i) in phonemes"
        :key="p.word"
        :class="['p-3 rounded-lg border cursor-pointer hover:-translate-y-0.5 transition-transform animate-card-enter', toneClasses(p.score)]"
        :style="`--delay:${i * 40}ms`"
      >
        <div class="flex items-center justify-between">
          <span class="text-[13px] font-semibold text-brand-ink dark:text-white font-poppins">{{ p.word }}</span>
          <span class="font-mono text-[11px]">{{ p.score }}</span>
        </div>
        <p v-if="p.issue" class="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-poppins">↑ {{ p.issue }}</p>
      </div>
    </div>
  </div>
</template>
