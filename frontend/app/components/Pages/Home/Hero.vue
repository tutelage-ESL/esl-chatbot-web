<template>
  <section
    class="relative overflow-hidden grain"
    style="background: linear-gradient(180deg, #111111 0%, #151414 60%, #1c1b1b 100%)"
  >
    <!-- Background layers -->
    <div class="absolute inset-0 hero-grid-bg opacity-80 pointer-events-none" />
    <div class="arc-glow" />
    <div class="arc-ring" />
    <div class="arc-bloom" />
    <div class="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
    <div class="absolute inset-x-0 -bottom-px h-24 bg-gradient-to-b from-transparent to-[#111] pointer-events-none" />

    <!-- Particles -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <span
        v-for="(p, i) in particles"
        :key="i"
        class="particle"
        :style="{
          left: p.left + '%',
          bottom: p.bottom + '%',
          opacity: p.op,
          animation: `rise ${p.dur}s linear ${p.delay}s infinite`,
        }"
      />
    </div>

    <div class="relative max-w-7xl mx-auto px-5 sm:px-8 pt-36 pb-28 sm:pb-36">
      <div class="grid lg:grid-cols-12 gap-14 items-center">

        <!-- Left copy -->
        <div class="lg:col-span-7 text-center lg:text-left">
          <div class="inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/10 pl-2 pr-3.5 py-1 text-[12px] text-white/80 mb-7">
            <span class="inline-flex items-center gap-1 bg-[#f59e0b]/15 text-[#f59e0b] px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wider uppercase">
              <Icon icon="lucide:sparkles" width="10" /> New
            </span>
            AI-Powered Learning, now in beta
          </div>

          <h1 class="font-semibold tracking-[-0.035em] text-white leading-[1.02] text-[44px] sm:text-[64px] lg:text-[78px]">
            Learn English <br class="hidden sm:block" />
            <span class="gradient-text">smarter</span>
            <span class="text-white/90"> with AI.</span>
          </h1>

          <p class="mt-6 text-[16px] sm:text-[18px] text-white/60 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            AI-powered conversations, voice practice, and intelligent progress tracking —
            all in one platform built for serious learners.
          </p>

          <div class="mt-9 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
            <a href="#cta" class="btn-primary inline-flex items-center gap-2 text-black font-semibold text-[14px] px-5 py-3 rounded-xl">
              Get Started <Icon icon="lucide:arrow-right" width="14" />
            </a>
            <a href="#" class="inline-flex items-center gap-2 text-white/90 font-medium text-[14px] px-5 py-3 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition">
              <Icon icon="lucide:message-circle" width="14" /> Try AI Chat
            </a>
          </div>

          <div class="mt-8 flex items-center gap-5 text-[12px] text-white/40 justify-center lg:justify-start">
            <span class="flex items-center gap-1.5"><Icon icon="lucide:check" width="12" class="text-[#f59e0b]" /> Free to start</span>
            <span class="flex items-center gap-1.5"><Icon icon="lucide:check" width="12" class="text-[#f59e0b]" /> No credit card</span>
            <span class="flex items-center gap-1.5"><Icon icon="lucide:check" width="12" class="text-[#f59e0b]" /> 40+ topics</span>
          </div>
        </div>

        <!-- Right mockup -->
        <div class="lg:col-span-5 flex justify-center lg:justify-end relative">
          <PagesHomeChatMockup />
        </div>
      </div>

      <!-- Trust bar -->
      <div class="mt-24 sm:mt-28">
        <div class="text-center text-[11px] uppercase tracking-[0.2em] text-white/35 mb-6">
          Trusted by 2,000+ learners worldwide
        </div>
        <div
          class="relative overflow-hidden"
          style="mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)"
        >
          <div class="flex marq-track gap-14 w-max">
            <div v-for="k in 2" :key="k" class="flex gap-14 items-center text-white/35 shrink-0">
              <div
                v-for="brand in brands"
                :key="brand.name"
                class="flex items-center gap-2 text-[15px] font-medium tracking-tight"
              >
                <Icon :icon="brand.icon" width="15" class="text-white/45" />
                <span>{{ brand.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const particles = Array.from({ length: 22 }, () => ({
  left:   Math.random() * 100,
  bottom: Math.random() * 30,
  delay:  Math.random() * 8,
  dur:    8 + Math.random() * 10,
  op:     0.2 + Math.random() * 0.5,
}))

const brands = [
  { name: 'Lumen',     icon: 'lucide:sparkles' },
  { name: 'Northwind', icon: 'lucide:globe' },
  { name: 'Halcyon',   icon: 'lucide:star' },
  { name: 'Veritas',   icon: 'lucide:shield' },
  { name: 'Meridian',  icon: 'lucide:target' },
  { name: 'Atlas Edu', icon: 'lucide:book-open' },
  { name: 'Forum',     icon: 'lucide:message-circle' },
  { name: 'Polyglot',  icon: 'lucide:activity' },
]
</script>
