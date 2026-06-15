<script setup lang="ts">
// Segmented language toggle for the public navbar.
// Maps over the locale registry, so adding a new language (e.g. Arabic)
// requires zero changes here — a third button appears automatically.
// When the list grows past ~3 locales, swap this for a <UiDropdownMenu>.
const { locale, locales, setLocale } = useLocale()
</script>

<template>
  <div
    role="group"
    aria-label="Select language"
    class="inline-flex items-center gap-0.5 rounded-lg border border-neutral-50/15 bg-neutral-50/5 p-0.5"
  >
    <button
      v-for="item in locales"
      :key="item.code"
      type="button"
      :aria-pressed="locale === item.code"
      :lang="item.htmlLang"
      class="rounded-md px-2.5 py-1 text-sm font-medium leading-none transition-colors"
      :class="locale === item.code
        ? 'bg-brand-primary text-white'
        : 'text-neutral-50/70 hover:text-neutral-50'"
      @click="setLocale(item.code)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
