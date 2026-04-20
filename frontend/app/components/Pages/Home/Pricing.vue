<template>
  <section id="pricing" class="bg-brand-muted/60 py-28 sm:py-32 border-y border-neutral-200/70">
    <div class="container-md layout-padding-md">
      <div class="max-w-2xl mx-auto text-center mb-14">
        <AppText size="11" weight="semibold" color="brand-primary" class-list="uppercase tracking-[0.2em] mb-3">
          Pricing
        </AppText>
        <AppText size="section-h2" weight="semibold" color="brand-ink" class-list="tracking-[-0.03em] leading-[1.05]">
          Start free. Upgrade when you're ready.
        </AppText>
      </div>

      <div class="grid md:grid-cols-2 gap-5">
        <div class="rounded-[14px] bg-neutral-50 border border-neutral-200/70 p-8 shadow-soft">
          <div class="flex items-center justify-between">
            <AppText size="13" weight="semibold" color="brand-ink" class-list="tracking-tight uppercase">Starter</AppText>
            <AppText size="11" weight="medium" color="brand-sub">Free forever</AppText>
          </div>
          <div class="mt-6 flex items-baseline gap-1">
            <AppText size="price" weight="semibold" color="brand-ink" class-list="tracking-[-0.035em]">$0</AppText>
            <AppText size="14" color="brand-sub">/month</AppText>
          </div>
          <AppText size="14" color="brand-sub" class-list="mt-2">Everything you need to try the core experience.</AppText>
          <AppButton to="#" variant="ink" size="52" radius="12" class-list="mt-6 w-full gap-2 text-[14px]">
            <span>Get started</span>
            <Icon icon="lucide:arrow-right" width="14" />
          </AppButton>
          <ul class="mt-8 space-y-3">
            <li v-for="item in starterFeatures" :key="item" class="flex items-center gap-3 text-[14px] text-brand-ink">
              <span class="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <Icon icon="lucide:check" width="12" />
              </span>
              <AppText size="14" color="brand-ink">{{ item }}</AppText>
            </li>
          </ul>
        </div>

        <div class="relative rounded-[14px] bg-neutral-50 p-8 shadow-card border-2 border-brand-primary/70">
          <div class="absolute -top-3 right-6 bg-brand-primary text-brand-ink text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-[0_6px_18px_-6px_rgba(245,158,11,0.6)] uppercase tracking-wider">
            Most Popular
          </div>
          <div class="flex items-center justify-between">
            <AppText size="13" weight="semibold" color="brand-ink" class-list="tracking-tight uppercase">Premium</AppText>
            <span class="text-[11px] font-medium text-brand-primary flex items-center gap-1">
              <Icon icon="lucide:sparkles" width="11" /> For serious learners
            </span>
          </div>
          <div class="mt-6 flex items-baseline gap-1">
            <AppText size="price" weight="semibold" color="brand-ink" class-list="tracking-[-0.035em]">$12</AppText>
            <AppText size="14" color="brand-sub">/month</AppText>
          </div>
          <AppText size="14" color="brand-sub" class-list="mt-2">Go all-in on the full Tutelage experience.</AppText>
          <AppButton to="#" variant="brand" size="52" radius="12" class-list="mt-6 w-full gap-2 text-[14px]">
            <span>Start 7-day trial</span>
            <Icon icon="lucide:arrow-right" width="14" />
          </AppButton>
          <ul class="mt-8 space-y-3">
            <li v-for="item in premiumFeatures" :key="item" class="flex items-center gap-3 text-[14px] text-brand-ink">
              <span class="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <Icon icon="lucide:check" width="12" />
              </span>
              <AppText size="14" color="brand-ink">{{ item }}</AppText>
            </li>
          </ul>
        </div>
      </div>

      <AppText size="12" color="brand-sub" class-list="text-center mt-8">Cancel anytime · Team & school plans on request</AppText>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const starterFeatures = [
  '1 active learning goal',
  'Limited TTS minutes',
  'Basic vocabulary SRS',
  'Weekly progress summary',
  'Community topics',
]

const premiumFeatures = [
  'Unlimited conversations',
  'Full TTS + priority voice',
  'Unlimited goals & decks',
  'Advanced analytics & reports',
  'Pronunciation heatmaps',
  'Priority support',
]
</script>
