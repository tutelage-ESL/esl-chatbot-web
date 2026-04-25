<script setup lang="ts">
import type { PhonemeScore } from '~/common/types/dashboard-types'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const recording = ref(false)

const prompt = "I think one of the most underrated travel experiences is a slow train journey — you really get to see how the landscape changes."

const phonemes: PhonemeScore[] = [
  { word: 'think',        score: 92, issue: null },
  { word: 'underrated',   score: 78, issue: 'stress on "rat"' },
  { word: 'travel',       score: 96, issue: null },
  { word: 'experiences',  score: 71, issue: 'syllable count' },
  { word: 'slow',         score: 94, issue: null },
  { word: 'train',        score: 89, issue: null },
  { word: 'journey',      score: 82, issue: 'soft J' },
  { word: 'really',       score: 95, issue: null },
  { word: 'landscape',    score: 76, issue: 'stress first syllable' },
  { word: 'changes',      score: 91, issue: null },
]
</script>

<template>
  <div class="p-5 sm:p-7 space-y-5">
    <!-- Header -->
    <div class="animate-card-enter" style="--delay:0ms">
      <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-brand-ink dark:text-white font-poppins">Voice Lab</h1>
      <p class="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1 font-poppins">Read the prompt aloud. We'll score every word.</p>
    </div>

    <!-- Prompt + Score row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="animate-card-enter lg:col-span-2" style="--delay:80ms">
        <DashboardVoicePromptCard
          :prompt="prompt"
          :phonemes="phonemes"
          :recording="recording"
          @toggle-record="recording = !recording"
          @analyze="() => {}"
          @hear-native="() => {}"
          @next-prompt="() => {}"
        />
      </div>
      <div class="animate-card-enter" style="--delay:160ms">
        <DashboardVoiceScorePanel />
      </div>
    </div>

    <!-- Phoneme breakdown -->
    <div class="animate-card-enter" style="--delay:240ms">
      <DashboardVoicePhonemeGrid :phonemes="phonemes" />
    </div>
  </div>
</template>
