<template>
  <label :for="forId" :class="computedClasses">
    <slot>{{ label }}<span v-if="required" class="text-red-500">&nbsp;*</span></slot>
  </label>
</template>

<script setup lang="ts">
import { twMerge } from 'tailwind-merge';

const props = defineProps<{
  forId?: string
  label?: string
  required?: boolean
  classList?: string
}>()

const computedClasses = computed(() => {
  const base = 'font-medium text-sm flex mb-2 capitalize dark:text-white'
  return twMerge(base, props.classList)
})
</script>
