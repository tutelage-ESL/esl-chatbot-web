<template>
  <section id="features" class="bg-white py-28 sm:py-32">
    <div class="max-w-7xl mx-auto px-5 sm:px-8">
      <div class="max-w-2xl reveal">
        <div class="text-[11px] uppercase tracking-[0.2em] text-[#f59e0b] font-semibold mb-3">Features</div>
        <h2 class="text-[40px] sm:text-[52px] font-semibold tracking-[-0.03em] leading-[1.05] text-[#111111]">
          Everything you need to master English.
        </h2>
        <p class="mt-4 text-[16px] text-[#4a4a50] max-w-xl">
          A complete toolkit — designed together, not bolted on. Every session feeds your goals, your vocabulary, and your analytics.
        </p>
      </div>

      <div class="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(feature, i) in features"
          :key="i"
          class="card-hover group relative rounded-[14px] bg-[#f2f2f2] border border-zinc-200/60 p-6 overflow-hidden"
        >
          <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f59e0b]/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
          <div class="w-11 h-11 rounded-xl bg-white border border-zinc-200/70 flex items-center justify-center shadow-[0_1px_2px_rgba(17,17,17,0.04),0_8px_24px_-12px_rgba(17,17,17,0.10)] mb-5 text-[#111111] group-hover:text-[#f59e0b] group-hover:border-[#f59e0b]/30 transition">
            <Icon :icon="feature.icon" width="20" />
          </div>
          <div class="text-[17px] font-semibold tracking-tight text-[#111111]">{{ feature.title }}</div>
          <p class="mt-2 text-[14px] leading-relaxed text-[#4a4a50]">{{ feature.description }}</p>
          <div class="mt-5 flex items-center gap-1.5 text-[12px] font-medium text-[#f59e0b] opacity-0 group-hover:opacity-100 transition">
            Learn more <Icon icon="lucide:arrow-right" width="12" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const features = [
  { icon: 'lucide:message-circle', title: 'AI Conversation',    description: 'Session-based chat with an AI tutor that adapts to your level, goals, and the topics you care about.' },
  { icon: 'lucide:mic',            title: 'Voice Practice',     description: 'Real-time speaking with live pronunciation feedback and natural back-and-forth dialogue.' },
  { icon: 'lucide:brain',          title: 'Vocabulary SRS',     description: 'A spaced repetition system that schedules reviews so new words actually stick long-term.' },
  { icon: 'lucide:activity',       title: 'Pronunciation Score',description: 'AI-powered accuracy scoring on individual phonemes so you know exactly what to work on.' },
  { icon: 'lucide:target',         title: 'Learning Goals',     description: 'Set weekly targets, track milestones, and get nudges when your streak is slipping.' },
  { icon: 'lucide:bar-chart-2',    title: 'Progress Analytics', description: 'Clear visual insights into time, vocabulary growth, fluency, and accuracy over time.' },
]
</script>
