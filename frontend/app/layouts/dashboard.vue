<script setup lang="ts">
  useHead({
    bodyAttrs: {
      class: 'overflow-x-hidden'
    }
  })
</script>


<template>
  <div class="min-h-dvh bg-neutral-50">
    <main class="w-full">
      <slot />
    </main>
  </div>
</template>
