<template>
  <div class="relative">
    <div class="absolute -inset-10 rounded-[32px] bg-[radial-gradient(closest-side,rgba(245,158,11,0.35),transparent_70%)] blur-2xl pointer-events-none" />
    <div class="glass-card relative rounded-2xl p-4 sm:p-5 w-[360px] sm:w-[420px] float">

      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-white/5">
        <div class="flex items-center gap-2.5">
          <div class="relative">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#fec016] flex items-center justify-center text-black">
              <Icon icon="lucide:sparkles" width="16" />
            </div>
            <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#18181b]" />
          </div>
          <div class="leading-tight">
            <div class="text-white text-sm font-semibold">AI Tutor · Maya</div>
            <div class="text-white/50 text-[11px] flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Session · B2 Intermediate
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <button class="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/70 hover:text-white">
            <Icon icon="lucide:mic" width="14" />
          </button>
          <button class="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/70 hover:text-white">
            <Icon icon="lucide:chevron-down" width="14" />
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div class="py-4 space-y-2.5 min-h-[260px]">
        <template v-for="(msg, i) in visibleMessages" :key="i">
          <div class="flex gap-2" :class="msg.who === 'user' ? 'justify-end' : 'justify-start'">
            <div
              v-if="msg.who === 'ai'"
              class="w-6 h-6 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#fec016] flex items-center justify-center shrink-0 mt-0.5"
            >
              <Icon icon="lucide:sparkles" width="11" />
            </div>
            <div
              class="max-w-[78%] text-[13px] leading-relaxed px-3 py-2 rounded-[12px]"
              :class="msg.who === 'user' ? 'msg-user rounded-br-sm' : 'msg-ai rounded-bl-sm'"
            >
              <div
                v-if="msg.tip"
                class="text-[10px] font-semibold uppercase tracking-wider text-[#f59e0b] mb-1 flex items-center gap-1"
              >
                <Icon icon="lucide:sparkles" width="10" /> Phrasing tip
              </div>
              {{ msg.text }}
              <div class="text-[10px] mt-1" :class="msg.who === 'user' ? 'text-black/50' : 'text-white/40'">
                {{ msg.t }}
              </div>
            </div>
          </div>
        </template>

        <!-- Typing indicator -->
        <div v-if="typing" class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#fec016] flex items-center justify-center shrink-0">
            <Icon icon="lucide:sparkles" width="11" />
          </div>
          <div class="msg-ai px-3 py-2.5 rounded-[12px] rounded-bl-sm">
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style="animation-delay: 0ms" />
              <span class="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style="animation-delay: 120ms" />
              <span class="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style="animation-delay: 240ms" />
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="mt-1 pt-3 border-t border-white/5">
        <div class="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
          <div class="flex items-end gap-0.5 h-5">
            <span
              v-for="(h, i) in waveBars"
              :key="i"
              class="wbar w-[3px] rounded-full bg-[#f59e0b]/80"
              style="height: 100%"
              :style="{ transform: `scaleY(${h})`, animationDelay: `${i * 120}ms` }"
            />
          </div>
          <div class="flex-1 text-[13px] text-white/60">
            Listening<span class="caret">…</span>
          </div>
          <button class="w-8 h-8 rounded-lg bg-[#f59e0b] text-black flex items-center justify-center shadow">
            <Icon icon="lucide:send" width="14" />
          </button>
        </div>
        <div class="flex items-center justify-between mt-2 px-1">
          <div class="flex items-center gap-3 text-[10px] text-white/40">
            <span class="flex items-center gap-1">
              <Icon icon="lucide:mic" width="10" /> Voice mode
            </span>
            <span>·</span>
            <span>Pronunciation: <span class="text-emerald-400 font-medium">92%</span></span>
          </div>
          <span class="text-[10px] text-white/40 font-mono">Session 14:22</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const convo = [
  { who: 'ai',   text: "Hi! I'm your English tutor. What would you like to practice today?", t: '10:04' },
  { who: 'user', text: 'I want to practice talking about travel.', t: '10:04' },
  { who: 'ai',   text: "Great choice! Tell me about a place you've visited recently.", t: '10:05' },
  { who: 'user', text: 'I went to Erbil last summer. It was very hot but beautiful.', t: '10:05' },
  { who: 'ai',   text: 'Nice! Quick tip: try "It was hot, but the city was beautiful." — it sounds more natural.', t: '10:06', tip: true },
] as const

const waveBars = [0.3, 0.7, 0.5, 0.9, 0.4, 0.8, 0.5]

const visible = ref(0)
const typing  = ref(false)

const visibleMessages = computed(() => convo.slice(0, visible.value))

onMounted(() => {
  const timers: ReturnType<typeof setTimeout>[] = []

  function step(i: number) {
    if (i >= convo.length) {
      timers.push(setTimeout(() => { visible.value = 0; step(0) }, 3500))
      return
    }
    typing.value = convo[i].who === 'ai' && i > 0
    timers.push(setTimeout(() => {
      typing.value = false
      visible.value = i + 1
      timers.push(setTimeout(() => step(i + 1), 1400))
    }, i === 0 ? 400 : 900))
  }

  step(0)

  onUnmounted(() => timers.forEach(clearTimeout))
})
</script>
