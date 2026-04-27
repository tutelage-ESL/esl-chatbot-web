<script setup lang="ts">
import type { PhonemeScore } from '~/common/types/dashboard-types'

defineProps<{
  prompt: string
  phonemes: PhonemeScore[]
  recording: boolean
}>()

const emit = defineEmits<{
  toggleRecord: []
  analyze: []
  hearNative: []
  nextPrompt: []
}>()

const BAR_COUNT = 48

function underlineColor(score: number) {
  if (score >= 90) return 'decoration-emerald-400'
  if (score >= 80) return 'decoration-brand-primary'
  return 'decoration-rose-400'
}

function phonemeOf(word: string, phonemes: PhonemeScore[]) {
  return phonemes.find(p => p.word === word.replace(/[^a-z]/gi, '').toLowerCase())
}
</script>

<template>
  <div class="dash-card p-6 lg:col-span-2 relative overflow-hidden">
    <!-- glow blob -->
    <div class="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-brand-primary/10 blur-3xl pointer-events-none" />
    <div class="relative">
      <p class="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">Read aloud · Prompt #42</p>

      <!-- Coloured prompt text -->
      <p class="mt-3 text-[22px] leading-snug text-brand-ink dark:text-white font-medium tracking-tight font-poppins">
        <template v-for="(word, i) in prompt.split(' ')" :key="i">
          <span
            :class="[
              'inline-block mr-1',
              phonemeOf(word, phonemes)
                ? `underline decoration-2 underline-offset-[6px] ${underlineColor(phonemeOf(word, phonemes)!.score)}`
                : '',
            ]"
          >{{ word }}</span>
        </template>
      </p>

      <!-- Waveform + record button -->
      <div class="mt-8 flex items-center gap-6">
        <button
          :class="[
            'relative w-20 h-20 rounded-full flex items-center justify-center transition-colors',
            recording ? 'bg-rose-500 text-white' : 'bg-brand-primary text-black',
          ]"
          @click="emit('toggleRecord')"
        >
          <!-- pulse ring when recording -->
          <span
            v-if="recording"
            class="pulse-ring absolute inset-0 rounded-full bg-rose-500 opacity-60"
          />
          <span class="relative">
            <AppIconsax name="Microphone" color="white" :size="28" />
          </span>
        </button>

        <!-- Animated bars -->
        <div class="flex-1">
          <div class="flex items-end gap-0.5 h-14">
            <span
              v-for="i in BAR_COUNT"
              :key="i"
              :class="[
                'w-0.75 rounded-full',
                recording ? 'waveform-bar bg-brand-primary' : 'bg-zinc-200 dark:bg-white/10',
              ]"
              :style="recording ? `--delay:${(i - 1) * 18}ms; height:${20 + Math.abs(Math.sin(i * 0.8)) * 80}%` : 'height:20%'"
            />
          </div>
          <div class="flex items-center justify-between mt-2 text-[11px] text-zinc-400 font-mono">
            <span>{{ recording ? '● Recording' : 'Ready' }}</span>
            <span>00:{{ recording ? '06' : '00' }} / 00:12</span>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="mt-6 flex items-center gap-2 flex-wrap">
        <AppButton variant="primary" size="36" radius="8" icon="Candle" :icon-config="{color:'white'}" text="Analyze" @click="emit('analyze')" />
        <AppButton variant="secondary" size="36" radius="8" icon="Volume" text="Hear native" @click="emit('hearNative')" />
        <AppButton variant="secondary" size="36" radius="8" icon="Refresh" text="Next prompt" @click="emit('nextPrompt')" />
      </div>
    </div>
  </div>
</template>
