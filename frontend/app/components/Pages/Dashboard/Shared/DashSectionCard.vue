<script setup lang="ts">
defineProps<{
  title: string
  icon?: string
  /** Footer link target — when set, renders a "see more" row at the bottom */
  to?: string
  linkLabel?: string
  delay?: number
}>()
</script>

<template>
  <div class="dash-card p-5 flex flex-col animate-card-enter" :style="`--delay:${delay ?? 0}ms`">
    <!-- Header -->
    <div class="flex items-center gap-2.5 mb-4">
      <div v-if="icon" class="size-8 rounded-lg flex items-center justify-center shrink-0" :style="`background:var(--surface-raised)`">
        <AppIconsax :name="icon as any" color="var(--color-text-muted)" :size="15" />
      </div>
      <p class="text-[16px] font-semibold font-poppins" :style="`color:var(--text-heading)`">{{ title }}</p>
    </div>

    <!-- Body -->
    <div class="flex-1 space-y-2.5">
      <slot />
    </div>

    <!-- Footer link -->
    <AppLink
      v-if="to"
      :to="to"
      class="group mt-4 pt-3.5 flex items-center justify-between cursor-pointer"
      :style="`border-top:1px solid var(--border-inner)`"
    >
      <span class="text-[14px] font-semibold font-poppins" style="color:var(--color-brand-primary)">
        {{ linkLabel ?? 'See all' }}
      </span>
      <span class="flex items-center justify-center size-6 rounded-lg transition-transform group-hover:translate-x-0.5" style="background:rgba(245,158,11,0.12)">
        <AppIconsax name="ArrowRight" color="var(--color-brand-primary)" :size="13" />
      </span>
    </AppLink>
  </div>
</template>
