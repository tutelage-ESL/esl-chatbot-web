<script setup lang="ts">
import { ref } from 'vue'

useHead({
  bodyAttrs: { class: 'overflow-x-hidden' },
})

const collapsed = ref(false)
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-neutral-50 dark:bg-neutral-900">
    <!-- Fixed sidebar -->
    <LayoutsDashboardSidebar :collapsed="collapsed" @toggle="collapsed = !collapsed" />

    <!-- Right column: topbar + scrollable page body -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <LayoutsDashboardHeader />

      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
