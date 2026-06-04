<script setup lang="ts">
/**
 * Pure-SVG donut chart. Accepts up to 5 segments.
 * No external library needed — matches the project's existing SVG chart pattern.
 */
const props = defineProps<{
  segments: Array<{ label: string; value: number; color: string }>
  size?: number
  thickness?: number
}>()

const SIZE = computed(() => props.size ?? 140)
const THICKNESS = computed(() => props.thickness ?? 28)

const R = computed(() => (SIZE.value - THICKNESS.value) / 2)
const CX = computed(() => SIZE.value / 2)
const CY = computed(() => SIZE.value / 2)
const CIRC = computed(() => 2 * Math.PI * R.value)

const total = computed(() => props.segments.reduce((s, seg) => s + seg.value, 0))

interface Arc {
  label: string
  value: number
  color: string
  dasharray: string
  dashoffset: string
}

const arcs = computed((): Arc[] => {
  if (total.value === 0) return []
  let offset = 0
  return props.segments.map((seg) => {
    const pct = seg.value / total.value
    const dash = (pct * CIRC.value).toFixed(2)
    const gap = (CIRC.value - pct * CIRC.value).toFixed(2)
    const off = (-offset * CIRC.value).toFixed(2)
    offset += pct
    return {
      label: seg.label,
      value: seg.value,
      color: seg.color,
      dasharray: `${dash} ${gap}`,
      dashoffset: off,
    }
  })
})

// Largest segment for center label
const largest = computed(() => {
  if (!props.segments.length) return null
  return props.segments.reduce((a, b) => (b.value > a.value ? b : a))
})

const largestPct = computed(() => {
  if (!largest.value || !total.value) return '—'
  return `${Math.round((largest.value.value / total.value) * 100)}%`
})
</script>

<template>
  <div class="flex items-center gap-5">
    <!-- Donut -->
    <div class="relative shrink-0" :style="`width:${SIZE}px;height:${SIZE}px`">
      <svg :width="SIZE" :height="SIZE" :viewBox="`0 0 ${SIZE} ${SIZE}`" class="-rotate-90">
        <!-- Track -->
        <circle
          :cx="CX" :cy="CY" :r="R"
          fill="none"
          stroke="var(--surface-raised)"
          :stroke-width="THICKNESS"
        />
        <!-- Segments -->
        <circle
          v-for="arc in arcs"
          :key="arc.label"
          :cx="CX" :cy="CY" :r="R"
          fill="none"
          :stroke="arc.color"
          :stroke-width="THICKNESS"
          :stroke-dasharray="arc.dasharray"
          :stroke-dashoffset="arc.dashoffset"
          stroke-linecap="butt"
          style="transition:stroke-dasharray 0.6s ease"
        />
      </svg>
      <!-- Center label -->
      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p class="text-[18px] font-bold font-poppins leading-none" :style="`color:var(--text-heading)`">{{ largestPct }}</p>
        <p class="text-[11px] font-poppins mt-0.5 leading-tight text-center" :style="`color:var(--text-subtle)`">{{ largest?.label }}</p>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-col gap-2 min-w-0 flex-1">
      <div v-for="seg in segments" :key="seg.label" class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="size-2.5 rounded-sm shrink-0" :style="`background:${seg.color}`" />
          <span class="text-[14px] font-poppins truncate" :style="`color:var(--text-body)`">{{ seg.label }}</span>
        </div>
        <span class="text-[14px] font-semibold font-poppins shrink-0" :style="`color:var(--text-heading)`">{{ seg.value }}</span>
      </div>
    </div>
  </div>
</template>
