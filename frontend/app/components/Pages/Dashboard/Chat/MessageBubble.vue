<script setup lang="ts">
import type { ChatMessage } from '~/common/types/dashboard-types'
defineProps<{ message: ChatMessage; userInitial?: string }>()
</script>

<template>
  <div
    :class="['flex items-start gap-2.5 animate-card-enter', message.who === 'user' ? 'flex-row-reverse' : '']"
    style="--delay:0ms"
  >
    <!-- Avatar -->
    <div
      v-if="message.who === 'ai'"
      class="w-7 h-7 rounded-full bg-linear-to-br from-brand-primary to-brand-accent flex items-center justify-center shrink-0"
    >
      <AppIconsax name="Candle" color="#000" :size="12" />
    </div>
    <div
      v-else
      class="w-7 h-7 rounded-full bg-linear-to-br from-brand-primary to-[#b45309] text-white flex items-center justify-center text-[11px] font-semibold shrink-0 font-poppins"
    >
      {{ userInitial ?? 'U' }}
    </div>

    <!-- Bubble -->
    <div :class="['max-w-[78%]', message.who === 'user' ? 'text-right' : '']">
      <div
        :class="[
          'inline-block px-3.5 py-2.5 text-[14px] leading-relaxed rounded-[14px] text-left font-poppins',
          message.who === 'user'
            ? 'bg-brand-ink text-white dark:bg-white dark:text-brand-ink rounded-br-sm'
            : 'bg-zinc-100 dark:bg-white/5 text-brand-ink dark:text-white rounded-bl-sm',
        ]"
      >
        {{ message.text }}
      </div>

      <!-- Phrasing tip correction -->
      <div
        v-if="message.correction"
        class="mt-2 inline-block max-w-full text-left p-3 rounded-xl bg-brand-primary/8 border border-brand-primary/20"
      >
        <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-1 font-poppins">
          <AppIconsax name="Candle" color="#f59e0b" :size="10" />
          Phrasing tip
        </div>
        <p class="text-[11.5px] text-zinc-500 dark:text-zinc-400 line-through font-poppins">{{ message.correction.original }}</p>
        <p class="text-[13px] font-medium text-brand-ink dark:text-white font-poppins">{{ message.correction.suggested }}</p>
        <p class="text-[11.5px] text-zinc-500 dark:text-zinc-400 mt-1 font-poppins">{{ message.correction.why }}</p>
      </div>

      <p class="mt-1 text-[10px] text-zinc-400 font-mono">{{ message.time }}</p>
    </div>
  </div>
</template>
