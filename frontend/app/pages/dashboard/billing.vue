<template>
  <div class="h-full overflow-y-auto" style="background:var(--surface-page)">
    <div class="max-w-6xl mx-auto p-5 sm:p-8">

      <!-- Header -->
      <div class="mb-8 animate-card-enter" style="--delay:0ms">
        <div class="flex items-center gap-3 mb-1">
          <div class="size-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2)">
            <AppIconsax name="Wallet2" color="var(--color-brand-primary)" :size="18" />
          </div>
          <div>
            <AppText size="22" weight="semibold" class-list="block tracking-[-0.02em]" :style="`color:var(--text-heading)`">Billing & Subscription</AppText>
            <AppText size="13" class-list="block" :style="`color:var(--text-muted)`">Manage your plan and payment method.</AppText>
          </div>
        </div>
      </div>

      <!-- Two-column layout: subscription panel left, plan comparison right -->
      <div class="grid lg:grid-cols-[1fr_340px] gap-6">

        <!-- Left: subscription panel -->
        <div class="animate-card-enter" style="--delay:60ms">
          <PagesDashboardSettingsSubscriptionPanel />
        </div>

        <!-- Right: plan comparison & FAQ -->
        <div class="space-y-5 animate-card-enter" style="--delay:100ms">

          <!-- Plan comparison card -->
          <div class="dash-card overflow-hidden">
            <div class="px-5 py-3.5" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
              <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.15em]" :style="`color:var(--text-subtle)`">Plan comparison</AppText>
            </div>
            <div class="divide-y" style="border-color:var(--border-inner)">
              <div v-for="row in comparisonRows" :key="row.label" class="grid grid-cols-3 px-4 py-2.5 text-center items-center">
                <AppText size="12" class-list="text-left" :style="`color:var(--text-body)`">{{ row.label }}</AppText>
                <AppText size="12" weight="semibold" :style="`color:var(--text-muted)`">{{ row.free }}</AppText>
                <AppText size="12" weight="semibold" :style="`color:var(--color-brand-primary)`">{{ row.gold }}</AppText>
              </div>
              <!-- Header row -->
            </div>
            <div class="grid grid-cols-3 px-4 py-2 text-center" style="background:var(--surface-raised);border-top:1px solid var(--border-inner)">
              <div />
              <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Free</AppText>
              <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" style="color:var(--color-brand-primary)">Gold+</AppText>
            </div>
          </div>

          <!-- Payment info -->
          <div class="dash-card p-5 space-y-3">
            <div class="flex items-center gap-2 mb-1">
              <AppIconsax name="SecuritySafe" color="var(--color-brand-primary)" :size="15" />
              <AppText size="13" weight="semibold" :style="`color:var(--text-heading)`">Secure payment via FIB</AppText>
            </div>
            <div v-for="point in paymentPoints" :key="point" class="flex items-start gap-2.5">
              <AppIconsax name="TickCircle" color="var(--color-brand-primary)" :size="13" class="shrink-0 mt-0.5" />
              <AppText size="12" :style="`color:var(--text-muted)`">{{ point }}</AppText>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'dashboard', requiresAuth: true })


const comparisonRows = [
  { label: 'Sessions/day',   free: '3',     gold: '15–50'  },
  { label: 'Msgs/session',   free: '20',    gold: '100–150' },
  { label: 'AI model',       free: 'Lite',  gold: 'Flash / GPT-5' },
  { label: 'Voice TTS',      free: '—',     gold: '✓' },
  { label: 'Analytics',      free: 'Basic', gold: 'Full' },
  { label: 'SRS vocab',      free: 'Basic', gold: 'Full' },
]

const paymentPoints = [
  'Paid securely through First Iraqi Bank (FIB)',
  'IQD currency only — no foreign exchange fees',
  'Cancel anytime, keep access until period ends',
  'Save up to 40% with a 12-month plan',
]
</script>
