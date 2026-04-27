<script setup lang="ts">
import type { ChatSession } from '~/common/types/dashboard-types'
defineProps<{ session: ChatSession }>()
</script>

<template>
  <button
    :class="[
      'w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
      session.active
        ? 'bg-brand-primary/10 text-brand-ink dark:text-white'
        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/3',
    ]"
  >
    <div class="w-7 h-7 rounded-lg bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center shrink-0">
      <AppIconsax name="Messages" color="currentColor" :size="12" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[12.5px] font-medium truncate font-poppins">{{ session.title }}</span>
        <span class="text-[10px] text-zinc-400 font-mono shrink-0">{{ session.when }}</span>
      </div>
      <span class="text-[10.5px] text-zinc-400 truncate block font-poppins">{{ session.preview }}</span>
    </div>
  </button>
</template>
