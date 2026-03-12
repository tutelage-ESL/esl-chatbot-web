<template>
<div v-if="error" class="w-full px-2 py-3 border border-red-500 text-red-500 bg-red-100 rounded-md">
  <AppText  weight="medium" class-list="text-red-500 text-xs flex items-center">
    <Info class="inline w-4 h-4 mr-1 mb-0.5" />
     {{ error }}
  </AppText>
</div>
</template>

<script setup lang="ts">
import { Info } from 'lucide-vue-next';

defineProps<{
  error?: string;
}>()
</script>

<style scoped>
li::marker {
  color: #bf242a;
}
</style>