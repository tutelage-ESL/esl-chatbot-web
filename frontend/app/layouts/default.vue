<script setup lang="ts">
  useHead({
    bodyAttrs: {
      class: 'overflow-x-hidden'
    }
  })
</script>


<template>
  <div>
    <LayoutsNavbar />
    <div class="w-full min-h-[calc(100dvh-844px)]">
      <slot />
    </div>
    <LayoutsFooter />
    <AppScrollToTopButton />
  </div>
</template>
