<template>
  <NuxtLink :to="to" :target="target" v-bind="attrs">
    <slot />
  </NuxtLink>
</template>

<script setup lang="ts">
const attrs = useAttrs()
defineProps<{
  to: string
  target?: string
}>()
</script>