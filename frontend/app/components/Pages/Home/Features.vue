<template>
  <section id="features" class="bg-neutral-50 py-28 sm:py-32">
    <div class="container-lg layout-padding-lg">
      <LayoutsSectionHeader
        eyebrow="Features"
        title="Everything you need to master English."
        description="A complete toolkit — designed together, not bolted on. Every session feeds your goals, your vocabulary, and your analytics."
        align="start"
        description-class="max-w-xl"
      />

      <div class="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(feature, i) in features"
          :key="i"
          class="group relative rounded-[14px] bg-brand-muted border border-neutral-200/60 p-6 overflow-hidden transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_20px_48px_-20px_rgba(17,17,17,0.18)]"
        >
          <div class="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-brand-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
          <div class="w-11 h-11 rounded-xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-center shadow-soft mb-5 text-brand-ink group-hover:text-brand-primary group-hover:border-brand-primary/30 transition">
            <Icon :icon="feature.icon" width="20" />
          </div>
          <AppText size="17" weight="semibold" color="brand-ink" class-list="tracking-tight">{{ feature.title }}</AppText>
          <AppText size="14" color="brand-sub" class-list="mt-2 leading-relaxed">{{ feature.description }}</AppText>
          <div class="mt-5 flex items-center gap-1.5 text-[12px] font-medium text-brand-primary opacity-0 group-hover:opacity-100 transition">
            <AppText class-list="cursor-pointer" size="12" color="brand-primary">Learn more</AppText>
            <Icon icon="lucide:arrow-right" width="12" />
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
