<template>
  <div class="relative">
    <div class="absolute -inset-8 rounded-[32px] bg-[radial-gradient(closest-side,rgba(245,158,11,0.12),transparent_70%)] pointer-events-none" />
    <div class="tilt rounded-2xl bg-white border border-zinc-200/70 shadow-[0_1px_0_rgba(17,17,17,0.04),0_12px_40px_-16px_rgba(17,17,17,0.12)] overflow-hidden">

      <!-- Window chrome -->
      <div class="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-200/70">
        <div class="flex gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <span class="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <span class="w-2.5 h-2.5 rounded-full bg-zinc-300" />
        </div>
        <div class="mx-auto text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
          <Icon icon="lucide:shield" width="10" /> app.tutelage.ai / dashboard
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4 p-5 bg-white">

        <!-- Sidebar -->
        <aside class="col-span-3 hidden md:flex flex-col gap-1 pr-3 border-r border-zinc-100">
          <div class="flex items-center gap-2 px-2 pb-3">
            <div class="w-7 h-7 rounded-lg bg-[#111111] flex items-center justify-center">
              <Icon icon="lucide:sparkles" width="12" class="text-[#f59e0b]" />
            </div>
            <div class="text-[13px] font-semibold tracking-tight">Tutelage</div>
          </div>
          <div
            v-for="item in sidebarItems"
            :key="item.label"
            class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px]"
            :class="item.active ? 'bg-[#f59e0b]/10 text-[#111111] font-medium' : 'text-zinc-500'"
          >
            <Icon :icon="item.icon" width="14" />
            <span>{{ item.label }}</span>
            <span v-if="item.active" class="ml-auto w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          </div>
          <div class="mt-auto pt-4 text-[11px] text-zinc-400 px-2">
            <div class="rounded-lg bg-zinc-50 border border-zinc-100 p-2.5">
              <div class="font-medium text-zinc-600 mb-0.5">Daily goal</div>
              <div class="h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                <div class="h-full w-[68%] bg-[#f59e0b] rounded-full" />
              </div>
              <div class="flex justify-between mt-1 text-[10px]">
                <span>17 min</span><span>25 min</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main -->
        <section class="col-span-12 md:col-span-9 space-y-4">
          <!-- Top bar -->
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Good morning</div>
              <div class="text-lg font-semibold tracking-tight">Welcome back, Aram 👋</div>
            </div>
            <button class="hidden sm:flex items-center gap-2 text-[12px] bg-[#111111] text-white px-3 py-1.5 rounded-lg">
              <Icon icon="lucide:message-circle" width="13" /> New session
            </button>
          </div>

          <!-- Stat cards -->
          <div class="grid grid-cols-4 gap-3">
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="rounded-xl border border-zinc-100 bg-white p-3"
            >
              <div class="flex items-center justify-between">
                <div class="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">{{ stat.label }}</div>
                <Icon :icon="stat.icon" width="13" class="text-zinc-300" />
              </div>
              <div class="text-[22px] font-semibold tracking-tight mt-1" :class="stat.color">{{ stat.value }}</div>
              <div class="text-[10px] text-zinc-400">{{ stat.sub }}</div>
            </div>
          </div>

          <!-- Chart + chat preview -->
          <div class="grid grid-cols-5 gap-3">
            <!-- Sparkline chart -->
            <div class="col-span-3 rounded-xl border border-zinc-100 p-4">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <div class="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Words learned</div>
                  <div class="text-base font-semibold tracking-tight">
                    1,248 <span class="text-[#f59e0b] text-[12px] font-medium">+12.4%</span>
                  </div>
                </div>
                <div class="text-[10px] text-zinc-400 font-mono">14d</div>
              </div>
              <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="w-full h-[140px] spark">
                <defs>
                  <linearGradient id="ag" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%"   stop-color="#f59e0b" stop-opacity="0.25" />
                    <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path :d="areaPath" fill="url(#ag)" stroke="none" />
                <path :d="linePath" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <g>
                  <circle :cx="lastX" :cy="lastY" r="4" fill="#f59e0b" />
                  <circle :cx="lastX" :cy="lastY" r="8" fill="#f59e0b" opacity="0.15" />
                </g>
              </svg>
              <!-- Heatmap -->
              <div class="mt-3">
                <div class="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-1.5">Practice consistency</div>
                <div class="flex gap-1">
                  <div v-for="(week, i) in heatWeeks" :key="i" class="flex flex-col gap-1">
                    <span
                      v-for="(n, j) in week"
                      :key="j"
                      class="w-3 h-3 rounded-[3px]"
                      :class="heatColor(n)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent session -->
            <div class="col-span-2 rounded-xl border border-zinc-100 p-3 flex flex-col">
              <div class="flex items-center justify-between mb-2">
                <div class="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Recent session</div>
                <span class="text-[10px] font-mono text-zinc-400">8 min ago</span>
              </div>
              <div class="space-y-2 text-[11px] flex-1">
                <div class="flex gap-1.5">
                  <div class="w-5 h-5 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#fec016] flex items-center justify-center shrink-0">
                    <Icon icon="lucide:sparkles" width="9" class="text-black" />
                  </div>
                  <div class="bg-zinc-50 rounded-lg rounded-tl-sm px-2 py-1.5 text-zinc-700">What's a goal you have this month?</div>
                </div>
                <div class="flex justify-end">
                  <div class="bg-[#111111] text-white rounded-lg rounded-tr-sm px-2 py-1.5 max-w-[85%]">I want to read two novels in English.</div>
                </div>
                <div class="flex gap-1.5">
                  <div class="w-5 h-5 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#fec016] flex items-center justify-center shrink-0">
                    <Icon icon="lucide:sparkles" width="9" class="text-black" />
                  </div>
                  <div class="bg-zinc-50 rounded-lg rounded-tl-sm px-2 py-1.5 text-zinc-700">Ambitious — which novels?</div>
                </div>
              </div>
              <div class="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between">
                <div class="text-[10px] text-zinc-400">12 turns · 94% accuracy</div>
                <button class="text-[10px] font-medium text-[#f59e0b] flex items-center gap-0.5">
                  Continue <Icon icon="lucide:arrow-right" width="10" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

// Sparkline
const pts = [12, 18, 14, 22, 19, 28, 24, 32, 30, 38, 35, 44, 42, 52]
const chartW = 520, chartH = 140, pad = 8
const maxV = Math.max(...pts), minV = Math.min(...pts)
const xs = pts.map((_, i) => pad + (i * (chartW - pad * 2)) / (pts.length - 1))
const ys = pts.map(v => chartH - pad - ((v - minV) / (maxV - minV)) * (chartH - pad * 2))
const linePath = xs.map((x, i) => `${i ? 'L' : 'M'}${x},${ys[i]}`).join(' ')
const areaPath = `${linePath} L${chartW - pad},${chartH - pad} L${pad},${chartH - pad} Z`
const lastX = xs[xs.length - 1]
const lastY = ys[ys.length - 1]

const heatWeeks = [
  [1, 2, 3, 4, 2, 0, 0],
  [3, 4, 5, 3, 4, 2, 1],
  [4, 5, 6, 5, 6, 4, 3],
  [5, 6, 7, 6, 5, 7, 6],
]

function heatColor(n: number) {
  if (n === 0) return 'bg-zinc-100'
  if (n <= 2)  return 'bg-[#f59e0b]/20'
  if (n <= 4)  return 'bg-[#f59e0b]/45'
  if (n <= 5)  return 'bg-[#f59e0b]/70'
  return 'bg-[#f59e0b]'
}

const sidebarItems = [
  { label: 'Dashboard', icon: 'lucide:bar-chart-2',    active: true },
  { label: 'Chat',      icon: 'lucide:message-circle', active: false },
  { label: 'Voice Lab', icon: 'lucide:mic',            active: false },
  { label: 'Vocabulary',icon: 'lucide:book-open',      active: false },
  { label: 'Goals',     icon: 'lucide:target',         active: false },
]

const stats = [
  { label: 'Lessons',    value: '124', sub: '+8 this week',       icon: 'lucide:book-open',       color: 'text-zinc-900' },
  { label: 'Study time', value: '42h', sub: 'this month',         icon: 'lucide:clock',           color: 'text-zinc-900' },
  { label: 'Streak',     value: '23',  sub: 'days · keep going',  icon: 'lucide:flame',           color: 'text-[#f59e0b]' },
  { label: 'Level',      value: 'B2',  sub: 'Upper-Intermediate', icon: 'lucide:star',            color: 'text-zinc-900' },
]
</script>
