<template>
  <header
    class="fixed top-0 inset-x-0 z-50 transition-all duration-300"
    :class="scrolled ? 'nav-dark' : ''"
  >
    <div class="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
      <a href="#" class="flex items-center gap-2 group">
        <div class="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#f59e0b] to-[#fec016] flex items-center justify-center shadow-[0_6px_20px_-6px_rgba(245,158,11,0.6)]">
          <Icon icon="lucide:sparkles" class="text-black" width="14" />
        </div>
        <span class="text-[15px] font-semibold tracking-tight text-white">
          Tutelage <span class="text-[#f59e0b]">AI</span>
        </span>
      </a>

      <nav class="hidden md:flex items-center gap-7 text-[13px] text-white/70">
        <a href="#features"  class="hover:text-[#f59e0b] transition">Features</a>
        <a href="#how"       class="hover:text-[#f59e0b] transition">How It Works</a>
        <a href="#dashboard" class="hover:text-[#f59e0b] transition">Dashboard</a>
        <a href="#pricing"   class="hover:text-[#f59e0b] transition">Pricing</a>
      </nav>

      <div class="flex items-center gap-2">
        <a
          href="#"
          class="hidden sm:inline-flex text-[13px] font-medium px-3.5 py-2 rounded-lg transition text-white/80 hover:text-white hover:bg-white/5"
        >
          Sign in
        </a>
        <a
          href="#cta"
          class="btn-primary inline-flex items-center gap-1.5 text-[13px] font-semibold text-black px-3.5 py-2 rounded-lg"
        >
          Get Started
          <Icon icon="lucide:arrow-right" width="13" />
        </a>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const scrolled = ref(false)

onMounted(() => {
  const onScroll = () => { scrolled.value = window.scrollY > 20 }
  window.addEventListener('scroll', onScroll)
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})
</script>
