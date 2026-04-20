<template>
  <section
    id="cta"
    class="relative overflow-hidden grain"
    style="background: linear-gradient(180deg, #111111 0%, #1c1b1b 100%)"
  >
    <div class="arc-bloom" style="top: 60%" />
    <div class="absolute inset-0 hero-grid-bg opacity-60 pointer-events-none" />
    <div class="relative max-w-4xl mx-auto px-5 sm:px-8 py-32 text-center">
      <div class="inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/10 px-3.5 py-1 text-[12px] text-white/80 mb-7">
        <Icon icon="lucide:sparkles" width="11" class="text-[#f59e0b]" /> Join 2,000+ learners
      </div>
      <h2 class="text-[44px] sm:text-[68px] font-semibold tracking-[-0.035em] text-white leading-[1.02]">
        Ready to transform <br class="hidden sm:block" />your English learning?
      </h2>
      <p class="mt-5 text-[17px] text-white/55 max-w-xl mx-auto">
        Your AI tutor, your voice lab, your progress — all in one place. Start your first session in under a minute.
      </p>
      <div class="mt-9 flex items-center justify-center gap-3 flex-wrap">
        <a href="#" class="btn-primary inline-flex items-center gap-2 text-black font-semibold text-[15px] px-6 py-3.5 rounded-xl">
          Get Started Free <Icon icon="lucide:arrow-right" width="14" />
        </a>
        <a href="#" class="inline-flex items-center gap-2 text-white/90 font-medium text-[15px] px-6 py-3.5 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition">
          <Icon icon="lucide:play" width="12" /> Watch 30s demo
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
</script>
