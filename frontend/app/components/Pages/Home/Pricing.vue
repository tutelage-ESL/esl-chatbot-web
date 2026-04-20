<template>
  <section id="pricing" class="bg-[#f2f2f2]/60 py-28 sm:py-32 border-y border-zinc-200/70">
    <div class="max-w-6xl mx-auto px-5 sm:px-8">
      <div class="max-w-2xl mx-auto text-center mb-14">
        <div class="text-[11px] uppercase tracking-[0.2em] text-[#f59e0b] font-semibold mb-3">Pricing</div>
        <h2 class="text-[40px] sm:text-[52px] font-semibold tracking-[-0.03em] leading-[1.05] text-[#111111]">
          Start free. Upgrade when you're ready.
        </h2>
      </div>

      <div class="grid md:grid-cols-2 gap-5">
        <!-- Starter -->
        <div class="rounded-[14px] bg-white border border-zinc-200/70 p-8 shadow-[0_1px_2px_rgba(17,17,17,0.04),0_8px_24px_-12px_rgba(17,17,17,0.10)]">
          <div class="flex items-center justify-between">
            <div class="text-[13px] font-semibold text-[#111111] tracking-tight uppercase">Starter</div>
            <span class="text-[11px] font-medium text-[#4a4a50]">Free forever</span>
          </div>
          <div class="mt-6 flex items-baseline gap-1">
            <span class="text-[52px] font-semibold tracking-[-0.035em] text-[#111111]">$0</span>
            <span class="text-[14px] text-[#4a4a50]">/month</span>
          </div>
          <p class="mt-2 text-[14px] text-[#4a4a50]">Everything you need to try the core experience.</p>
          <a href="#" class="mt-6 w-full inline-flex items-center justify-center gap-2 bg-[#111111] text-white rounded-xl py-3 text-[14px] font-semibold hover:bg-zinc-800 transition">
            Get started <Icon icon="lucide:arrow-right" width="14" />
          </a>
          <ul class="mt-8 space-y-3">
            <li v-for="item in starterFeatures" :key="item" class="flex items-center gap-3 text-[14px] text-[#111111]">
              <span class="w-5 h-5 rounded-full check-dot flex items-center justify-center">
                <Icon icon="lucide:check" width="12" />
              </span>
              {{ item }}
            </li>
          </ul>
        </div>

        <!-- Premium -->
        <div class="relative rounded-[14px] bg-white p-8 shadow-[0_1px_0_rgba(17,17,17,0.04),0_12px_40px_-16px_rgba(17,17,17,0.12)] border-2 border-[#f59e0b]/70">
          <div class="absolute -top-3 right-6 bg-[#f59e0b] text-black text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-[0_6px_18px_-6px_rgba(245,158,11,0.6)] uppercase tracking-wider">
            Most Popular
          </div>
          <div class="flex items-center justify-between">
            <div class="text-[13px] font-semibold text-[#111111] tracking-tight uppercase">Premium</div>
            <span class="text-[11px] font-medium text-[#f59e0b] flex items-center gap-1">
              <Icon icon="lucide:sparkles" width="11" /> For serious learners
            </span>
          </div>
          <div class="mt-6 flex items-baseline gap-1">
            <span class="text-[52px] font-semibold tracking-[-0.035em] text-[#111111]">$12</span>
            <span class="text-[14px] text-[#4a4a50]">/month</span>
          </div>
          <p class="mt-2 text-[14px] text-[#4a4a50]">Go all-in on the full Tutelage experience.</p>
          <a href="#" class="mt-6 w-full btn-primary inline-flex items-center justify-center gap-2 text-black rounded-xl py-3 text-[14px] font-semibold">
            Start 7-day trial <Icon icon="lucide:arrow-right" width="14" />
          </a>
          <ul class="mt-8 space-y-3">
            <li v-for="item in premiumFeatures" :key="item" class="flex items-center gap-3 text-[14px] text-[#111111]">
              <span class="w-5 h-5 rounded-full check-dot flex items-center justify-center">
                <Icon icon="lucide:check" width="12" />
              </span>
              {{ item }}
            </li>
          </ul>
        </div>
      </div>

      <div class="text-center text-[12px] text-[#4a4a50] mt-8">Cancel anytime · Team & school plans on request</div>
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
