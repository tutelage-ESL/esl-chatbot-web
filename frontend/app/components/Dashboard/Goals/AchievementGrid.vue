<script setup lang="ts">
import type { Achievement } from '~/common/types/dashboard-types'
defineProps<{ achievements: Achievement[] }>()
</script>

<template>
  <div class="dash-card p-5 animate-card-enter" style="--delay:320ms">
    <div class="flex items-center justify-between mb-4">
      <div>
        <p class="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">Achievements</p>
        <p class="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400 font-poppins">
          {{ achievements.filter(a => a.earned).length }} of {{ achievements.length }} unlocked
        </p>
      </div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div
        v-for="(a, i) in achievements"
        :key="a.title"
        :class="[
          'p-4 rounded-xl border text-center relative overflow-hidden animate-card-enter',
          a.earned
            ? 'bg-linear-to-br from-brand-primary/10 to-transparent border-brand-primary/30'
            : 'bg-zinc-50 dark:bg-white/2 border-black/5 dark:border-white/5',
        ]"
        :style="`--delay:${400 + i * 50}ms`"
      >
        <div
          :class="[
            'w-10 h-10 mx-auto rounded-full flex items-center justify-center',
            a.earned ? 'bg-brand-primary text-black' : 'bg-zinc-200 dark:bg-white/5 text-zinc-400',
          ]"
        >
          <AppIconsax :name="a.icon as any" color="white" :size="16" />
        </div>
        <p
          :class="['mt-2 text-[12px] font-semibold font-poppins', a.earned ? 'text-brand-ink dark:text-white' : 'text-zinc-500 dark:text-zinc-400']"
        >{{ a.title }}</p>
        <p class="text-[10px] text-zinc-400 font-poppins">{{ a.description }}</p>
        <div
          v-if="!a.earned && a.progress"
          class="mt-2 h-1 rounded-full bg-zinc-200 dark:bg-white/5 overflow-hidden"
        >
          <div
            class="h-full bg-brand-primary rounded-full animate-fill-bar"
            :style="`width:${a.progress}%; --delay:${600 + i * 50}ms`"
          />
        </div>
      </div>
    </div>
  </div>
</template>
