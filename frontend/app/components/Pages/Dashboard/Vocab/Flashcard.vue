<script setup lang="ts">
import type { VocabCard, SrsRating } from '~/common/types/dashboard-types'

defineProps<{ card: VocabCard; cardIndex: number; total: number }>()
const emit = defineEmits<{ rate: [rating: SrsRating] }>()

const flipped = ref(false)

const ratingConfig: { label: SrsRating; cls: string }[] = [
  { label: 'Again', cls: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  { label: 'Hard',  cls: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' },
  { label: 'Good',  cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { label: 'Easy',  cls: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
]

function rate(r: SrsRating) {
  flipped.value = false
  emit('rate', r)
}
</script>

<template>
  <div class="dash-card p-8 lg:col-span-2 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
    <!-- dot texture -->
    <div class="dot-bg absolute inset-0 opacity-40 pointer-events-none" />

    <div class="relative w-full max-w-md flip-container">
      <div :class="['flip-inner', flipped ? 'flipped' : '']">
        <!-- Front face -->
        <div class="flip-front w-full">
          <div class="dash-card p-8 min-h-[280px] flex flex-col items-center justify-center text-center">
            <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">
              Card {{ cardIndex }} of {{ total }}
            </p>
            <h2 class="mt-3 text-[44px] font-semibold tracking-[-0.03em] text-brand-ink dark:text-white font-poppins">
              {{ card.word }}
            </h2>
            <p class="mt-1 text-[14px] text-zinc-400 font-mono">{{ card.phonetic }}</p>
            <button class="mt-3 w-9 h-9 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary/20 transition">
              <AppIconsax name="Volume" color="#f59e0b" :size="14" />
            </button>
            <button
              class="mt-6 text-[12px] text-zinc-500 dark:text-zinc-400 font-medium hover:text-brand-primary transition font-poppins"
              @click="flipped = true"
            >
              Tap to reveal meaning →
            </button>
          </div>
        </div>

        <!-- Back face -->
        <div class="flip-back w-full">
          <div class="dash-card p-6 min-h-[280px]">
            <div class="flex items-center gap-2 text-[10px] uppercase tracking-wider flex-wrap">
              <span
                v-for="tag in card.tags"
                :key="tag"
                class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 font-semibold font-poppins"
              >{{ tag }}</span>
              <span class="text-zinc-400 ml-auto font-mono">{{ card.pos }}</span>
            </div>
            <h3 class="mt-3 text-[22px] font-semibold tracking-tight text-brand-ink dark:text-white font-poppins">{{ card.word }}</h3>
            <p class="mt-2 text-[14px] text-brand-ink dark:text-white leading-relaxed font-poppins">{{ card.definition }}</p>
            <p class="mt-3 p-3 rounded-lg bg-zinc-50 dark:bg-white/3 text-[13px] italic text-zinc-600 dark:text-zinc-300 leading-relaxed font-poppins">
              "{{ card.example }}"
            </p>
            <button
              class="mt-4 text-[12px] text-zinc-500 dark:text-zinc-400 font-medium hover:text-brand-primary transition font-poppins"
              @click="flipped = false"
            >
              ← Back to word
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SRS rating buttons (only when flipped) -->
    <Transition name="fade-up">
      <div v-if="flipped" class="relative mt-6 flex items-center gap-2">
        <button
          v-for="r in ratingConfig"
          :key="r.label"
          :class="['text-[12.5px] font-semibold px-4 py-2 rounded-lg border transition-transform hover:scale-105 font-poppins', r.cls]"
          @click="rate(r.label)"
        >
          {{ r.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-up-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.fade-up-enter-from   { opacity: 0; transform: translateY(8px); }
</style>
