<script setup lang="ts">
import type { VocabDeck } from '~/common/types/dashboard-types'

defineProps<{ decks: VocabDeck[] }>()

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Today's forecast -->
    <div class="dash-card p-5 animate-card-enter" style="--delay:80ms">
      <p class="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">Today's forecast</p>
      <div class="mt-3 grid grid-cols-3 gap-2 text-center">
        <div class="p-2 rounded-lg bg-zinc-50 dark:bg-white/3">
          <p class="text-[20px] font-semibold tracking-tight text-emerald-500 font-poppins">4</p>
          <p class="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-poppins">New</p>
        </div>
        <div class="p-2 rounded-lg bg-zinc-50 dark:bg-white/3">
          <p class="text-[20px] font-semibold tracking-tight text-brand-primary font-poppins">12</p>
          <p class="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-poppins">Due</p>
        </div>
        <div class="p-2 rounded-lg bg-zinc-50 dark:bg-white/3">
          <p class="text-[20px] font-semibold tracking-tight text-brand-ink dark:text-white font-poppins">128</p>
          <p class="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold font-poppins">Learned</p>
        </div>
      </div>
    </div>

    <!-- Decks -->
    <div class="dash-card p-5 animate-card-enter" style="--delay:160ms">
      <p class="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold mb-3 font-poppins">Your decks</p>
      <div class="space-y-2">
        <div v-for="d in decks" :key="d.name" class="flex items-center gap-3">
          <div
            :class="['w-8 h-8 rounded-lg bg-linear-to-br flex items-center justify-center text-white text-[10px] font-semibold shrink-0 font-poppins', d.gradient]"
          >
            {{ initials(d.name) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[12.5px] font-medium text-brand-ink dark:text-white truncate font-poppins">{{ d.name }}</p>
            <p class="text-[10.5px] text-zinc-400 font-poppins">{{ d.count }} cards</p>
          </div>
          <span
            v-if="d.due > 0"
            class="text-[10px] font-semibold bg-brand-primary text-white px-1.5 py-0.5 rounded-full font-poppins"
          >{{ d.due }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
