<script setup lang="ts">
import type { CallPhase, Speaker } from '~/composables/useVoiceLab'

const props = defineProps<{
  phase: CallPhase
  speaker: Speaker
  level: number // 0–1 live mic loudness
}>()

// The orb breathes with the AI while it speaks, and reacts to your voice while
// it listens. A gentle idle pulse keeps it alive between turns.
const scale = computed(() => {
  if (props.phase === 'listening') return 1 + props.level * 0.22
  if (props.phase === 'speaking') return 1.06
  return 1
})

const aiSpeaking = computed(() => props.speaker === 'ai')
const userTalking = computed(() => props.phase === 'listening')
const connecting = computed(() => props.phase === 'connecting')
const thinking = computed(() => props.phase === 'thinking')
</script>

<template>
  <div class="relative flex items-center justify-center" style="width:240px;height:240px">
    <!-- outer reactive halo -->
    <div
      class="absolute rounded-full bg-brand-primary/15 blur-2xl transition-transform duration-150 ease-out"
      style="width:240px;height:240px"
      :style="{ transform: `scale(${0.7 + level * 0.5})` }"
    />

    <!-- listening ripple rings -->
    <template v-if="userTalking">
      <span class="absolute rounded-full border border-brand-primary/30" style="width:200px;height:200px"
        :style="{ transform: `scale(${1 + level * 0.5})`, opacity: 0.2 + level * 0.6 }" />
    </template>

    <!-- AI speaking pulse -->
    <span v-if="aiSpeaking" class="pulse-ring absolute rounded-full bg-brand-primary/40" style="width:170px;height:170px" />

    <!-- core orb -->
    <div
      class="relative grid place-content-center rounded-full shadow-[0_20px_60px_-15px_rgba(245,158,11,0.55)] transition-transform duration-150 ease-out"
      :class="aiSpeaking
        ? 'bg-linear-to-br from-brand-primary to-brand-accent'
        : 'bg-linear-to-br from-[#1a1a1e] to-[#2a2a30] dark:from-[#1a1a1e] dark:to-[#2a2a30]'"
      style="width:150px;height:150px"
      :style="{ transform: `scale(${scale})` }"
    >
      <!-- inner sheen -->
      <div class="absolute inset-2 rounded-full bg-white/5" />

      <AppIconsax
        :name="userTalking ? 'Microphone2' : 'Candle'"
        :color="aiSpeaking ? '#000' : '#f59e0b'"
        :size="44"
        class="relative"
      />

      <!-- connecting / thinking spinner ring -->
      <span
        v-if="connecting || thinking"
        class="absolute inset-0 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin"
      />
    </div>
  </div>
</template>
