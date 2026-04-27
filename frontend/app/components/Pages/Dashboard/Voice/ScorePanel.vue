<script setup lang="ts">
const metrics = [
  { label: 'Accuracy',   value: 88 },
  { label: 'Fluency',    value: 82 },
  { label: 'Pace',       value: 91 },
  { label: 'Intonation', value: 79 },
]
</script>

<template>
  <div class="dash-card p-5">
    <p class="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">Score</p>
    <div class="mt-2 flex items-baseline gap-2">
      <span class="text-[48px] font-semibold tracking-[-0.03em] text-brand-ink dark:text-white font-poppins leading-none">86</span>
      <span class="text-[14px] text-zinc-400 font-poppins">/100</span>
    </div>
    <p class="text-[12px] text-brand-primary font-medium font-poppins">+4 vs last attempt</p>

    <div class="mt-4 space-y-2.5">
      <div v-for="(m, i) in metrics" :key="m.label">
        <div class="flex justify-between text-[11.5px] mb-1">
          <span class="text-zinc-500 dark:text-zinc-400 font-poppins">{{ m.label }}</span>
          <span class="text-brand-ink dark:text-white font-medium font-poppins">{{ m.value }}</span>
        </div>
        <div class="h-1.5 rounded-full bg-zinc-100 dark:bg-white/5 overflow-hidden">
          <div
            class="h-full bg-linear-to-r from-brand-primary to-brand-accent rounded-full animate-fill-bar"
            :style="`width:${m.value}%; --delay:${200 + i * 80}ms`"
          />
        </div>
      </div>
    </div>
  </div>
</template>
