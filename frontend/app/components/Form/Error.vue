<template>
  <div v-if="error">
    <p class="text-xs  mt-1 text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  error?: string;
}>()
</script>

<style scoped>
li::marker {
  color: #bf242a;
}
</style>