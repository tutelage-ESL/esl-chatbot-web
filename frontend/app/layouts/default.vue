<script setup lang="ts">
  // Locale + direction are scoped to the PUBLIC layout only — the dashboard
  // and auth layouts never bind these, so they stay English/LTR regardless
  // of the chosen language. `dir="rtl"` here flips text flow + Tailwind's
  // `rtl:` variants for the whole marketing site at once.
  const { dir, htmlLang } = useLocale()

  useHead({
    bodyAttrs: {
      class: 'overflow-x-hidden'
    }
  })
</script>


<template>
  <div :dir="dir" :lang="htmlLang" class="min-h-dvh bg-neutral-50">
    <LayoutsNavbar />
    <main class="w-full">
      <slot />
    </main>
    <LayoutsFooter />
    <AppScrollToTopButton />
  </div>
</template>
