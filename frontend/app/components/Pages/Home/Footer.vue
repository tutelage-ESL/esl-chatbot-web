<template>
  <footer class="bg-[#111111] text-white/70">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 pt-20 pb-10">
      <div class="grid md:grid-cols-5 gap-10">

        <!-- Brand col -->
        <div class="md:col-span-2">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#f59e0b] to-[#fec016] flex items-center justify-center">
              <Icon icon="lucide:sparkles" width="14" class="text-black" />
            </div>
            <span class="text-white text-[15px] font-semibold tracking-tight">
              Tutelage <span class="text-[#f59e0b]">AI</span>
            </span>
          </div>
          <p class="mt-5 text-[13px] text-white/50 max-w-xs leading-relaxed">
            An AI-powered English learning platform — conversations, voice, vocabulary and real progress in one place.
          </p>
          <div class="mt-6 flex items-center gap-2">
            <a
              v-for="s in socials"
              :key="s"
              href="#"
              class="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-[11px] font-semibold text-white/70 hover:text-[#f59e0b] hover:border-[#f59e0b]/30 transition"
            >{{ s }}</a>
          </div>
        </div>

        <!-- Link cols -->
        <div v-for="col in cols" :key="col.heading">
          <div class="text-[11px] uppercase tracking-[0.2em] text-white/45 font-semibold mb-4">{{ col.heading }}</div>
          <ul class="space-y-2.5 text-[13px]">
            <li v-for="link in col.links" :key="link">
              <a href="#" class="hover:text-[#f59e0b] transition">{{ link }}</a>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-16 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-white/40">
        <div>© 2026 Tutelage AI. All rights reserved.</div>
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1.5">
            <Icon icon="lucide:globe" width="12" /> English
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" /> All systems normal
          </span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const socials = ['X', 'in', 'gh', 'yt']

const cols = [
  { heading: 'Product',   links: ['Features', 'AI Chat', 'Voice Lab', 'Vocabulary', 'Pricing'] },
  { heading: 'Resources', links: ['Blog', 'Guides', 'Placement Test', 'Changelog', 'Status'] },
  { heading: 'Company',   links: ['About', 'Careers', 'Press', 'Partners', 'Contact'] },
  { heading: 'Legal',     links: ['Privacy', 'Terms', 'Cookies', 'Security', 'DPA'] },
]
</script>
