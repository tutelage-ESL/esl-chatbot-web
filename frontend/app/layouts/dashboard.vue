<script setup lang="ts">
useHead({
  bodyAttrs: { class: 'overflow-x-hidden' },
})

const collapsed = ref(false)
const mobileOpen = ref(false)
</script>

<template>
  <div class="flex h-dvh bg-neutral-50 dark:bg-neutral-900 relative">
    <LayoutsDashboardSidebar
      :collapsed="collapsed"
      :mobile-open="mobileOpen"
      @toggle="collapsed = !collapsed"
      @close-mobile="mobileOpen = false"
    />

    <!-- Collapse toggle — rendered here (not inside the aside) so it sits above
         the sibling overflow-hidden div and is never clipped by it -->
    <button
      :class="[
        'hidden md:flex absolute top-20 z-50 w-6 h-6 rounded-full',
        'bg-white dark:bg-[#151517] border border-border shadow-sm',
        'items-center justify-center text-zinc-400 hover:text-brand-primary',
        'transition-all duration-300',
        collapsed ? 'left-14' : 'left-55',
      ]"
      @click="collapsed = !collapsed"
    >
      <AppIconsax
        name="ArrowRight"
        color="currentColor"
        :size="12"
        :class="collapsed ? '' : 'rotate-180'"
        class="transition-transform duration-300"
      />
    </button>

    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <LayoutsDashboardHeader @open-sidebar="mobileOpen = true" />

      <main class="flex-1 min-h-0 overflow-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>
