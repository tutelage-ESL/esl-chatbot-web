<script setup lang="ts">
import type { LessonCategory } from '~/common/types/dashboard-types'

const props = defineProps<{ modelValue: LessonCategory }>()
const emit  = defineEmits<{ 'update:modelValue': [v: LessonCategory] }>()

const cats: LessonCategory[] = ['All', 'Business', 'Travel', 'Grammar', 'Real-life', 'Pronunciation', 'Exams']
</script>

<template>
  <div class="flex gap-1.5 flex-wrap">
    <button
      v-for="c in cats"
      :key="c"
      :class="[
        'text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors font-poppins',
        props.modelValue === c
          ? 'bg-brand-primary text-black'
          : 'bg-zinc-100 dark:bg-white/4 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/8',
      ]"
      @click="emit('update:modelValue', c)"
    >
      {{ c }}
    </button>
  </div>
</template>
