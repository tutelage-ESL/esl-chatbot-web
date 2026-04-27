<script setup lang="ts">
import type { VocabCard, VocabDeck, SrsRating } from '~/common/types/dashboard-types'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const card: VocabCard = {
  word: 'meticulous',
  phonetic: '/məˈtɪkjələs/',
  pos: 'adjective',
  definition: 'Showing great attention to detail; very careful and precise.',
  example: "She's meticulous about her notes — every page is color-coded.",
  tags: ['B2', 'formal', 'positive'],
}

const decks: VocabDeck[] = [
  { name: 'Business English',    count: 142, due: 8,  gradient: 'from-[#f59e0b] to-[#fb923c]' },
  { name: 'Travel & culture',    count: 98,  due: 4,  gradient: 'from-[#0ea5e9] to-[#22d3ee]' },
  { name: 'Daily phrasal verbs', count: 76,  due: 0,  gradient: 'from-[#10b981] to-[#34d399]' },
  { name: 'IELTS Band 7+',       count: 220, due: 12, gradient: 'from-[#8b5cf6] to-[#a78bfa]' },
]

function onRate(_rating: SrsRating) {
  // future: advance to next card
}
</script>

<template>
  <div class="h-full overflow-y-auto p-5 sm:p-7 space-y-5">
    <!-- Header -->
    <div class="flex items-end justify-between flex-wrap gap-3 animate-card-enter" style="--delay:0ms">
      <div>
        <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-brand-ink dark:text-white font-poppins">Vocabulary</h1>
        <p class="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1 font-poppins">
          <span class="text-brand-primary font-medium">12 cards</span> due · spaced repetition
        </p>
      </div>
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" size="36" radius="8" icon="Add" text="New deck" />
        <AppButton variant="primary" size="36" radius="8" icon="ArrowRight" :icon-config="{color: 'white'}" icon-position="end" text="Review 12 due" />
      </div>
    </div>

    <!-- Flashcard + sidebar -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="animate-card-enter" style="--delay:80ms">
        <PagesDashboardVocabFlashcard :card="card" :card-index="1" :total="12" @rate="onRate" />
      </div>
      <div class="animate-card-enter" style="--delay:160ms">
        <PagesDashboardVocabDeckList :decks="decks" />
      </div>
    </div>
  </div>
</template>
