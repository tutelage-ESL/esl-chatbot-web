<script setup lang="ts">
defineProps<{
  topic: string | null | undefined
  cefrLabel: string
  isSessionEnded: boolean
  activeSessionId: string | null
  ending: boolean
  refreshing?: boolean
}>()

const emit = defineEmits<{
  'voice': []
  'refresh': []
  'end': []
}>()
</script>

<template>
  <div class="h-14 border-b border-black/6 dark:border-white/6 flex items-center justify-between px-5 shrink-0">
    <div class="flex items-center gap-2.5">
      <div class="relative">
        <div
          class="w-9 h-9 rounded-full bg-linear-to-br from-brand-primary to-brand-accent flex items-center justify-center">
          <AppIconsax name="Candle" color="#000" :size="14" />
        </div>
        <span :class="[
          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#0e0e10]',
          isSessionEnded ? 'bg-zinc-400' : 'bg-emerald-400',
        ]" />
      </div>
      <div class="leading-tight">
        <p class="text-[13px] font-semibold text-brand-ink dark:text-white font-poppins">Tutelage · AI Tutor</p>
        <p class="text-[10.5px] text-zinc-400 font-poppins">
          {{ topic || 'Open conversation' }} · {{ cefrLabel }} · {{ isSessionEnded ? 'Ended' : 'Casual' }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-1.5">
      <AppButton variant="outline" :disabled="!activeSessionId || refreshing" @click="emit('refresh')" >
        <AppIconsax name="Refresh" color="currentColor" :size="14" :class="refreshing ? 'animate-spin' : ''" />
      </AppButton>
      <AppButton text="End Session" @click="emit('end')" />
    </div>
  </div>
</template>
