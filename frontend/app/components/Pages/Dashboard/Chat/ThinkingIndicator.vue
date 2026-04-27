<template>
  <div class="flex items-start gap-2.5 animate-card-enter" style="--delay:0ms">
    <div class="w-7 h-7 rounded-full bg-linear-to-br from-brand-primary to-brand-accent flex items-center justify-center shrink-0">
      <AppIconsax name="Candle" color="#000" :size="12" />
    </div>
    <div class="flex items-center gap-2">
      <!-- Bouncing dots -->
      <div class="flex gap-1 px-3 py-2.5 rounded-[14px] rounded-bl-sm bg-zinc-100 dark:bg-white/5">
        <span class="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" />
        <span class="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:120ms]" />
        <span class="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:240ms]" />
      </div>
      <span class="shimmer-text text-[11px] font-medium text-zinc-500 dark:text-zinc-400 font-poppins">Maya is thinking…</span>
    </div>
  </div>
</template>
