<script setup lang="ts">
import type { ChartRange, ChartPoint } from '~/common/types/dashboard-types'

const props = defineProps<{
  points: ChartPoint[]
  totalWords: number
  growth: string
}>()

const activeRange = ref<ChartRange>('30d')
const ranges: ChartRange[] = ['7d', '30d', 'All']

const W = 640, H = 180, PAD = 10

const svgPath = computed(() => {
  const vals = props.points.map(p => p.value)
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const xs = vals.map((_, i) => PAD + (i * (W - PAD * 2)) / (vals.length - 1))
  const ys = vals.map(v => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2))
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${(ys[i] ?? 0).toFixed(1)}`).join(' ')
  const area = `${d} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`
  const lastX = xs[xs.length - 1]
  const lastY = ys[ys.length - 1]
  return { d, area, lastX, lastY }
})

const gridLines = [0, 1, 2, 3].map(i => PAD + i * ((H - PAD * 2) / 3))
</script>

<template>
  <div class="dash-card p-5">
    <div class="flex items-start justify-between mb-3">
      <div>
        <AppText size="10" color="neutral-400" weight="semibold" uppercase class="tracking-[0.18em] font-poppins">
          Vocabulary growth
        </AppText>
        <div class="mt-1 flex items-baseline gap-2">
          <AppText size="22" weight="semibold" color="brand-ink" class="tracking-tight font-poppins">
            {{ totalWords.toLocaleString() }} words
          </AppText>
          <AppText size="12" weight="medium" color="brand-primary" class="font-poppins">{{ growth }}</AppText>
        </div>
      </div>
      <div class="flex items-center gap-1 text-[11px] font-medium font-poppins">
        <button
          v-for="r in ranges"
          :key="r"
          :class="[
            'px-2 py-1 rounded-md transition-colors',
            activeRange === r
              ? 'bg-zinc-100 dark:bg-white/6 text-brand-ink dark:text-white'
              : 'text-zinc-400 hover:text-brand-ink dark:hover:text-white',
          ]"
          @click="activeRange = r"
        >
          {{ r }}
        </button>
      </div>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full h-45">
      <defs>
        <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--color-brand-primary)" stop-opacity="0.28" />
          <stop offset="100%" stop-color="var(--color-brand-primary)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <!-- Grid lines -->
      <line
        v-for="(y, i) in gridLines"
        :key="i"
        :x1="PAD" :x2="W - PAD"
        :y1="y" :y2="y"
        stroke="currentColor"
        class="text-zinc-200 dark:text-white/5"
        stroke-dasharray="3,4"
      />
      <!-- Area fill -->
      <path :d="svgPath.area" fill="url(#chartGrad)" stroke="none" />
      <!-- Line -->
      <path
        :d="svgPath.d"
        fill="none"
        stroke="var(--color-brand-primary)"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- Last point indicator -->
      <g>
        <circle :cx="svgPath.lastX" :cy="svgPath.lastY" r="10" fill="var(--color-brand-primary)" opacity="0.15" />
        <circle :cx="svgPath.lastX" :cy="svgPath.lastY" r="4" fill="var(--color-brand-primary)" />
      </g>
    </svg>

    <!-- X-axis labels -->
    <div class="flex items-center justify-between text-[10px] text-zinc-400 mt-2 font-mono px-2">
      <span v-for="p in points.filter((_, i) => i % Math.ceil(points.length / 6) === 0 || i === points.length - 1)" :key="p.label">
        {{ p.label }}
      </span>
    </div>
  </div>
</template>
