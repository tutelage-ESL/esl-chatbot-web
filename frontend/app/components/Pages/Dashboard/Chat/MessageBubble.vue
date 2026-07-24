<script setup lang="ts">
import type { ChatMessage } from '~/common/types/dashboard-types'

const props = defineProps<{ message: ChatMessage; userInitial?: string }>()

// ── Voice audio player ────────────────────────────────────────────────────
// Two sources: `audioUrl` (R2 link, present on fetched voice messages — both
// the user's recording and the AI's TTS reply) and `audioBase64` (TTS that
// streamed in live during a voice turn, AI replies only).
const audioSrc = computed(() => {
  if (props.message.audioBase64) return `data:audio/mpeg;base64,${props.message.audioBase64}`
  if (props.message.audioUrl) return props.message.audioUrl
  return null
})
const hasAudio = computed(() => props.message.type === 'VOICE' && !!audioSrc.value)

const isPlaying = ref(false)
const progress = ref(0)   // 0–100
const elapsed = ref(0)    // seconds
const duration = ref(0)   // seconds

let audio: HTMLAudioElement | null = null
let rafId: number | null = null

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function tick() {
  if (!audio) return
  elapsed.value = audio.currentTime
  duration.value = audio.duration || 0
  progress.value = duration.value ? (audio.currentTime / duration.value) * 100 : 0
  rafId = requestAnimationFrame(tick)
}

function stopAudio() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  audio?.pause()
  audio = null
  isPlaying.value = false
  progress.value = 0
  elapsed.value = 0
}

function toggleAudio() {
  if (isPlaying.value) { stopAudio(); return }
  if (!audioSrc.value) return
  stopAudio()
  audio = new Audio(audioSrc.value)
  audio.onloadedmetadata = () => { duration.value = audio?.duration || 0 }
  audio.onended = () => { stopAudio() }
  audio.play().catch(() => { })
  isPlaying.value = true
  rafId = requestAnimationFrame(tick)
}

// Click on the progress bar to seek
function seek(e: MouseEvent) {
  if (!audio || !duration.value) return
  const bar = e.currentTarget as HTMLElement
  const ratio = e.offsetX / bar.offsetWidth
  audio.currentTime = ratio * duration.value
}

// Auto-play when audioBase64 first arrives on this bubble
watch(() => props.message.audioBase64, (b64) => {
  if (b64) nextTick(toggleAudio)
})

onBeforeUnmount(stopAudio)
</script>

<template>
  <div :class="['flex items-start gap-2.5 animate-card-enter', message.who === 'user' ? 'flex-row-reverse' : '']"
    style="--delay:0ms">
    <!-- Avatar -->
    <div v-if="message.who === 'ai'"
      class="w-7 h-7 rounded-full bg-linear-to-br from-brand-primary to-brand-accent flex items-center justify-center shrink-0">
      <AppIconsax name="Candle" color="#000" :size="12" />
    </div>
    <div v-else
      class="w-7 h-7 rounded-full bg-linear-to-br from-brand-primary to-[#b45309] text-white flex items-center justify-center text-[11px] font-semibold shrink-0 font-poppins">
      {{ userInitial ?? 'U' }}
    </div>

    <!-- Bubble -->
    <div :class="['max-w-[78%]', message.who === 'user' ? 'text-right' : '']">
      <div :class="[
        'inline-block px-3.5 py-2.5 text-[14px] leading-relaxed rounded-[14px] text-left font-poppins',
        message.who === 'user'
          ? 'bg-brand-ink text-white dark:bg-white dark:text-brand-ink rounded-br-sm'
          : 'bg-zinc-100 dark:bg-white/5 text-brand-ink dark:text-white rounded-bl-sm',
      ]">
        <span v-if="message.who === 'user'">{{ message.text }}</span>
        <!-- v-html is safe here: AI responses come from our own backend, not user input -->
        <div v-else v-html="message.text" class="ai-prose" />
      </div>

      <!-- Voice player — on any voice message that has audio (user recording or AI reply) -->
      <div v-if="hasAudio"
        class="mt-2 flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-surface-raised border border-border-inner w-56 text-left"
        :class="message.who === 'user' ? 'ml-auto' : ''">
        <!-- Play / Pause button -->
        <button class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition"
          :class="isPlaying ? 'bg-brand-primary' : 'bg-surface-well hover:bg-brand-primary/15'" @click="toggleAudio">
          <AppIconsax :name="isPlaying ? 'Pause' : 'Play'" :color="isPlaying ? 'white' : 'var(--color-text-body)'"
            :size="15" />
        </button>

        <!-- Progress bar + timestamps -->
        <div class="flex-1 min-w-0">
          <!-- Clickable scrub bar -->
          <div class="relative h-1.5 rounded-full bg-border-inner cursor-pointer overflow-hidden" @click="seek">
            <div class="absolute inset-y-0 left-0 rounded-full bg-brand-primary transition-none"
              :style="{ width: `${progress}%` }" />
          </div>
          <!-- Timestamps -->
          <div class="flex justify-between mt-1">
            <span class="text-[10px] font-mono text-text-subtle">{{ fmt(elapsed) }}</span>
            <span class="text-[10px] font-mono text-text-subtle">{{ fmt(duration) }}</span>
          </div>
        </div>
      </div>

      <!-- Phrasing tip correction -->
      <div v-if="message.correction"
        class="mt-2 inline-block max-w-full text-left p-3 rounded-xl bg-brand-primary/8 border border-brand-primary/20">
        <div
          class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-1 font-poppins">
          <AppIconsax name="Candle" color="#f59e0b" :size="10" />
          Phrasing tip
        </div>
        <p class="text-[11.5px] text-zinc-500 dark:text-zinc-400 line-through font-poppins">{{
          message.correction.original }}</p>
        <p class="text-[13px] font-medium text-brand-ink dark:text-white font-poppins">{{ message.correction.suggested
          }}</p>
        <p class="text-[11.5px] text-zinc-500 dark:text-zinc-400 mt-1 font-poppins">{{ message.correction.why }}</p>
      </div>

      <p class="mt-1 text-[10px] text-zinc-400 font-mono">{{ message.time }}</p>
    </div>
  </div>
</template>

<style scoped>
.ai-prose :deep(p) {
  margin-bottom: 0.5em;
}
.ai-prose :deep(p:last-child) {
  margin-bottom: 0;
}
.ai-prose :deep(strong) {
  font-weight: 600;
}
.ai-prose :deep(em) {
  font-style: italic;
}
.ai-prose :deep(ul),
.ai-prose :deep(ol) {
  padding-left: 1.25em;
  margin-bottom: 0.5em;
}
.ai-prose :deep(ul) {
  list-style-type: disc;
}
.ai-prose :deep(ol) {
  list-style-type: decimal;
}
.ai-prose :deep(li) {
  margin-bottom: 0.25em;
}
</style>
