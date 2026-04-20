<template>
  <section id="dashboard" class="bg-neutral-50 py-28 sm:py-36 overflow-hidden">
    <div class="container-lg layout-padding-lg">
      <div class="max-w-2xl mx-auto text-center mb-14">
        <AppText size="11" weight="semibold" color="brand-primary" class-list="uppercase tracking-[0.2em] mb-3">
          Dashboard
        </AppText>
        <AppText size="section-h2" weight="semibold" color="brand-ink" class-list="tracking-[-0.03em] leading-[1.05]">
          Your learning command center.
        </AppText>
        <AppText size="16" color="brand-sub" class-list="mt-4">
          Streaks, vocabulary, minutes and level — all in one calm view, so you always know what to do next.
        </AppText>
      </div>
      <div class="relative">
        <PagesHomeDashboardMockup />
        <div class="absolute inset-x-0 -bottom-10 h-32 bg-linear-to-t from-neutral-50 via-neutral-50/80 to-transparent pointer-events-none" />
      </div>
    </div>
  </section>
</template>
