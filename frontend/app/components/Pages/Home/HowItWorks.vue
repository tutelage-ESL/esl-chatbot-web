<template>
  <section id="how" class="bg-[#f2f2f2]/60 py-28 sm:py-32 border-y border-zinc-200/70">
    <div class="max-w-7xl mx-auto px-5 sm:px-8">
      <div class="flex items-end justify-between flex-wrap gap-6 mb-14">
        <div class="max-w-2xl">
          <div class="text-[11px] uppercase tracking-[0.2em] text-[#f59e0b] font-semibold mb-3">How it works</div>
          <h2 class="text-[40px] sm:text-[52px] font-semibold tracking-[-0.03em] leading-[1.05] text-[#111111]">
            Three steps. Real fluency.
          </h2>
        </div>
        <a href="#cta" class="text-[13px] font-medium text-[#111111] inline-flex items-center gap-1 hover:text-[#f59e0b]">
          See it in action <Icon icon="lucide:arrow-right" width="13" />
        </a>
      </div>

      <div class="relative grid md:grid-cols-3 gap-6">
        <!-- Connecting dashed line -->
        <div class="hidden md:block absolute top-[46px] left-[12%] right-[12%] h-px step-line opacity-70" />

        <div
          v-for="(step, i) in steps"
          :key="i"
          class="relative bg-white border border-zinc-200/70 rounded-[14px] p-6 shadow-[0_1px_2px_rgba(17,17,17,0.04),0_8px_24px_-12px_rgba(17,17,17,0.10)]"
        >
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-full bg-[#f59e0b] text-black font-semibold flex items-center justify-center text-[13px] shadow-[0_8px_18px_-8px_rgba(245,158,11,0.7)]">
              {{ step.n }}
            </div>
            <div class="flex-1 h-px bg-zinc-200" />
            <Icon :icon="step.icon" width="18" class="text-[#4a4a50]" />
          </div>
          <div class="text-[20px] font-semibold tracking-tight text-[#111111]">{{ step.title }}</div>
          <p class="mt-2 text-[14px] text-[#4a4a50] leading-relaxed">{{ step.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const steps = [
  { n: '01', icon: 'lucide:message-circle', title: 'Start a Conversation', description: 'Choose a topic — travel, work, interviews — and begin chatting with an AI tuned to your level.' },
  { n: '02', icon: 'lucide:mic',            title: 'Practice Speaking',    description: 'Switch on voice mode for real pronunciation practice with instant feedback on what you said.' },
  { n: '03', icon: 'lucide:bar-chart-2',    title: 'Track & Improve',      description: 'Watch your vocabulary, fluency and streak grow with analytics that celebrate real progress.' },
]
</script>
