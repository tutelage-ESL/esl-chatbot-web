<script setup lang="ts">
import type { VocabularyItem, SrsRating } from '~/common/types/vocabulary-types'
import { MASTERY_LABEL } from '~/common/types/vocabulary-types'

const props = defineProps<{
  card: VocabularyItem
  cardIndex: number
  total: number
  reviewing?: boolean
}>()
const emit = defineEmits<{ rate: [rating: SrsRating] }>()

const flipped = ref(false)

watch(() => props.card.id, () => { flipped.value = false })

interface RatingConfig {
  label: SrsRating
  desc: string
  bg: string
  text: string
  border: string
  icon: string
}

const ratingConfig: RatingConfig[] = [
  { label: 'Again', desc: 'Forgot',   bg: 'bg-rose-500/10 hover:bg-rose-500/20',    text: 'text-rose-500',        border: 'border-rose-500/30',        icon: '✗' },
  { label: 'Hard',  desc: 'Difficult', bg: 'bg-amber-500/10 hover:bg-amber-500/20',  text: 'text-amber-500',       border: 'border-amber-500/30',       icon: '~' },
  { label: 'Good',  desc: 'Recalled',  bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', text: 'text-emerald-500',  border: 'border-emerald-500/30',     icon: '✓' },
  { label: 'Easy',  desc: 'Perfect',   bg: 'bg-sky-500/10 hover:bg-sky-500/20',       text: 'text-sky-500',        border: 'border-sky-500/30',         icon: '★' },
]

const masteryLabel = computed(() => MASTERY_LABEL[props.card.masteryLevel] ?? 'New')

const masteryColor = computed(() => {
  const m = props.card.masteryLevel
  if (m === 0) return 'bg-zinc-100 dark:bg-white/5 text-text-muted'
  if (m === 1) return 'bg-sky-500/10 text-sky-500'
  if (m === 2) return 'bg-amber-500/10 text-amber-500'
  if (m === 3) return 'bg-violet-500/10 text-violet-500'
  if (m === 4) return 'bg-emerald-500/10 text-emerald-500'
  return 'bg-brand-primary/10 text-brand-primary'
})

function rate(r: SrsRating) {
  emit('rate', r)
}
</script>

<template>
  <div class="dash-card p-6 lg:col-span-2 flex flex-col items-center justify-center min-h-95 relative overflow-hidden">
    <div class="dot-bg absolute inset-0 opacity-40 pointer-events-none" />

    <!-- Progress bar -->
    <div class="relative w-full max-w-md mb-5">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[14px] font-medium font-poppins" style="color:var(--text-muted)">
          Card {{ cardIndex }} of {{ total }}
        </span>
        <span :class="['text-[14px] font-semibold px-2.5 py-1 rounded-full font-poppins', masteryColor]">
          {{ masteryLabel }}
        </span>
      </div>
      <div class="h-1 rounded-full overflow-hidden" style="background:var(--border-inner)">
        <div
          class="h-full rounded-full bg-brand-primary transition-all duration-500"
          :style="`width:${Math.round((cardIndex / total) * 100)}%`"
        />
      </div>
    </div>

    <!-- Card -->
    <div class="relative w-full max-w-md flip-container">
      <div :class="['flip-inner', flipped ? 'flipped' : '']">

        <!-- Front face -->
        <div class="flip-front w-full">
          <div class="dash-card p-8 min-h-70 flex flex-col items-center justify-center text-center cursor-pointer" @click="flipped = true">
            <h2 class="text-[44px] font-semibold tracking-[-0.03em] font-poppins" style="color:var(--text-heading)">
              {{ card.word }}
            </h2>
            <p v-if="card.pronunciation" class="mt-2 text-[15px] font-mono" style="color:var(--text-muted)">
              {{ card.pronunciation }}
            </p>
            <div class="mt-6 flex items-center gap-1.5 text-[14px] font-medium font-poppins" style="color:var(--text-subtle)">
              <AppIconsax name="Eye" color="currentColor" :size="15" />
              Tap to reveal meaning
            </div>
          </div>
        </div>

        <!-- Back face -->
        <div class="flip-back w-full">
          <div class="dash-card p-6 min-h-70">
            <div class="flex items-center gap-2 flex-wrap">
              <span :class="['text-[14px] font-semibold px-2.5 py-1 rounded-full font-poppins', masteryColor]">{{ masteryLabel }}</span>
              <span v-if="card.category" class="text-[14px] font-medium px-2.5 py-1 rounded-full font-poppins" style="background:var(--surface-raised);color:var(--text-muted)">{{ card.category }}</span>
              <span v-if="card.partOfSpeech" class="text-[14px] font-mono ml-auto" style="color:var(--text-subtle)">{{ card.partOfSpeech }}</span>
            </div>
            <h3 class="mt-3 text-[22px] font-semibold tracking-tight font-poppins" style="color:var(--text-heading)">{{ card.word }}</h3>
            <p class="mt-2 text-[15px] leading-relaxed font-poppins" style="color:var(--text-body)">{{ card.definition }}</p>
            <p v-if="card.example" class="mt-3 p-3 rounded-xl text-[14px] italic leading-relaxed font-poppins" style="background:var(--surface-raised);color:var(--text-muted)">
              "{{ card.example }}"
            </p>
            <button
              class="mt-4 flex items-center gap-1.5 text-[14px] font-medium transition-colors font-poppins cursor-pointer"
              style="color:var(--text-subtle)"
              @click="flipped = false"
            >
              <AppIconsax name="ArrowLeft" color="currentColor" :size="14" />
              Back to word
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rating buttons — only when flipped -->
    <Transition name="fade-up">
      <div v-if="flipped" class="relative mt-5 w-full max-w-md grid grid-cols-4 gap-2">
        <button
          v-for="r in ratingConfig"
          :key="r.label"
          :disabled="reviewing"
          :class="[
            'flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border transition-all duration-200 cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            r.bg, r.border,
          ]"
          @click="rate(r.label)"
        >
          <span :class="['text-[18px] font-bold leading-none', r.text]">{{ r.icon }}</span>
          <span :class="['text-[15px] font-semibold font-poppins', r.text]">{{ r.label }}</span>
          <span class="text-[13px] font-poppins" style="color:var(--text-subtle)">{{ r.desc }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-up-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.fade-up-enter-from   { opacity: 0; transform: translateY(10px); }
</style>
