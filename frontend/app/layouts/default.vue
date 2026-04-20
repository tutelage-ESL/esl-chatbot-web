<script setup lang="ts">
  useHead({
    bodyAttrs: {
      class: 'overflow-x-hidden'
    }
  })
</script>


<template>
  <div class="min-h-dvh bg-neutral-50">
    <LayoutsNavbar />
    <main class="w-full">
      <slot />
    </main>
    <LayoutsFooter />
    <AppScrollToTopButton />
  </div>
</template>
