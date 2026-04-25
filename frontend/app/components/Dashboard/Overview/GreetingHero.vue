<script setup lang="ts">
import { useAuthStore } from '~~/stores/auth'

const props = defineProps<{
  streak: number
  doneMins: number
  goalMins: number
}>()

const emit = defineEmits<{
  navChat: []
  navVoice: []
  navVocab: []
}>()

const authStore = useAuthStore()
const name = computed(() => authStore.getUser?.username ?? 'there')

const R = 48
const circumference = 2 * Math.PI * R
const goalPct = computed(() => Math.min(1, props.doneMins / props.goalMins))
const offset   = computed(() => circumference * (1 - goalPct.value))
const minsLeft = computed(() => props.goalMins - props.doneMins)
</script>

<template>
  <div class="dash-card relative overflow-hidden">
    <!-- dot texture -->
    <div class="dot-bg absolute inset-0 opacity-80 pointer-events-none" />
    <!-- glow orb -->
    <div class="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-brand-primary/10 blur-3xl pointer-events-none" />

    <div class="relative p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
      <!-- Text + CTA -->
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-semibold font-poppins">Good morning</p>
        <h1 class="mt-1 text-[32px] sm:text-[38px] font-semibold tracking-[-0.03em] text-brand-ink dark:text-white leading-[1.1] font-poppins">
          Welcome back, {{ name }}.
        </h1>
        <p class="mt-2 text-[14px] text-zinc-500 dark:text-zinc-400 max-w-md font-poppins">
          You're <span class="text-brand-primary font-medium">{{ minsLeft }} minutes</span> away from hitting today's goal. Keep that streak alive 🔥
        </p>

        <div class="mt-5 flex flex-wrap items-center gap-2">
          <AppButton variant="primary" size="38" radius="8" icon="Messages" :icon-config="{color: 'white'}" text="Continue conversation" @click="emit('navChat')" />
          <AppButton variant="secondary" size="38" radius="8" icon="Microphone" text="Practice speaking" @click="emit('navVoice')" />
          <AppButton variant="secondary" size="38" radius="8" icon="Book1" text="Review 12 words" @click="emit('navVocab')" />
        </div>
      </div>

      <!-- Ring + streak -->
      <div class="flex items-center gap-5 shrink-0">
        <!-- Goal progress ring with CSS draw-in -->
        <div class="relative w-32 h-32">
          <svg viewBox="0 0 120 120" class="w-full h-full -rotate-90">
            <defs>
              <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stop-color="var(--color-brand-accent)" />
                <stop offset="100%" stop-color="var(--color-brand-primary)" />
              </linearGradient>
            </defs>
            <!-- track -->
            <circle cx="60" cy="60" :r="R" stroke="currentColor" class="text-zinc-200 dark:text-white/10" stroke-width="10" fill="none" />
            <!-- animated fill -->
            <circle
              cx="60" cy="60" :r="R"
              stroke="url(#ringGrad)"
              stroke-width="10"
              fill="none"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="offset"
              class="ring-animate"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-[26px] font-semibold tracking-tight text-brand-ink dark:text-white leading-none font-poppins">
              {{ doneMins }}<span class="text-[13px] text-zinc-400 font-normal">/{{ goalMins }}</span>
            </span>
            <span class="text-[10px] uppercase tracking-wider text-zinc-400 mt-0.5 font-poppins">min today</span>
          </div>
        </div>

        <!-- Streak flame -->
        <div class="text-center">
          <div class="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary/15 border border-brand-primary/20">
            <AppIconsax name="Flash" color="var(--color-brand-primary)" :size="26" />
          </div>
          <div class="mt-2 text-[22px] font-semibold tracking-tight text-brand-ink dark:text-white leading-none font-poppins">{{ streak }}</div>
          <div class="text-[10px] uppercase tracking-wider text-zinc-400 mt-1 font-poppins">day streak</div>
        </div>
      </div>
    </div>
  </div>
</template>
