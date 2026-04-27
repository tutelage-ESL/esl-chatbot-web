<script setup lang="ts">
const pronunciationWords = [
  { word: 'citadel',   score: 99, tone: 'ok'  },
  { word: 'beautiful', score: 87, tone: 'mid' },
  { word: 'weekend',   score: 74, tone: 'low' },
]

const corrections = [
  { original: 'very hot but beautiful',   fixed: 'really hot, but it was beautiful', note: 'Repetition makes casual speech feel more natural.' },
  { original: 'lots of food together',    fixed: 'a ton of food together',            note: '"A ton of" is more idiomatic in casual American English.' },
]

const newWords = ['citadel', 'stunning', 'hospitality', 'unwind', 'catch up']

const trySaying = [
  '"I mostly just caught up with family."',
  '"We had a ton of home-cooked food."',
  '"Honestly, I needed a break."',
]

function scoreColor(tone: string) {
  if (tone === 'ok')  return 'text-emerald-500'
  if (tone === 'mid') return 'text-brand-primary'
  return 'text-rose-500'
}
</script>

<template>
  <aside class="w-75 border-l border-black/6 dark:border-white/6 bg-white dark:bg-[#0e0e10] hidden lg:flex flex-col shrink-0 overflow-hidden">
    <!-- Header -->
    <div class="px-4 h-14 flex items-center justify-between border-b border-black/6 dark:border-white/6 shrink-0">
      <p class="text-[11px] uppercase tracking-[0.18em] font-semibold text-zinc-400 font-poppins">Live coaching</p>
      <span class="text-[10px] text-brand-primary font-semibold font-poppins flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-brand-primary inline-block" />
        Recording
      </span>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-5">
      <!-- Pronunciation score -->
      <div>
        <p class="text-[10.5px] uppercase tracking-[0.18em] text-zinc-400 font-semibold mb-2 font-poppins">Pronunciation</p>
        <div class="dash-card p-3">
          <div class="flex items-center justify-between">
            <p class="text-[20px] font-semibold text-brand-ink dark:text-white font-poppins">92<span class="text-[12px] text-zinc-400 font-normal">%</span></p>
            <span class="text-[10px] text-emerald-500 font-medium font-poppins">Strong</span>
          </div>
          <div class="mt-2 h-1.5 rounded-full bg-zinc-100 dark:bg-white/5 overflow-hidden">
            <div class="h-full bg-linear-to-r from-brand-primary to-brand-accent rounded-full animate-fill-bar" style="width:92%; --delay:300ms" />
          </div>
          <div class="mt-3 space-y-1.5">
            <div v-for="w in pronunciationWords" :key="w.word" class="flex items-center justify-between text-[11.5px]">
              <span class="text-brand-ink dark:text-white font-medium font-poppins">{{ w.word }}</span>
              <span :class="['font-mono', scoreColor(w.tone)]">{{ w.score }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Corrections -->
      <div>
        <p class="text-[10.5px] uppercase tracking-[0.18em] text-zinc-400 font-semibold mb-2 font-poppins">Corrections this session ({{ corrections.length }})</p>
        <div class="space-y-2">
          <div v-for="c in corrections" :key="c.original" class="dash-card p-3">
            <p class="text-[11px] text-zinc-400 line-through font-poppins">{{ c.original }}</p>
            <p class="text-[13px] font-medium text-brand-ink dark:text-white mt-0.5 font-poppins">{{ c.fixed }}</p>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 font-poppins">{{ c.note }}</p>
          </div>
        </div>
      </div>

      <!-- New vocabulary -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10.5px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">New vocabulary ({{ newWords.length }})</p>
          <button class="text-[10px] font-medium text-brand-primary hover:underline font-poppins">Save all</button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="w in newWords"
            :key="w"
            class="text-[11.5px] px-2 py-1 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-poppins"
          >{{ w }}</span>
        </div>
      </div>

      <!-- Try saying -->
      <div>
        <p class="text-[10.5px] uppercase tracking-[0.18em] text-zinc-400 font-semibold mb-2 font-poppins">Try saying</p>
        <div class="space-y-1.5">
          <button
            v-for="s in trySaying"
            :key="s"
            class="w-full text-left text-[12px] px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/3 border border-black/4 dark:border-white/4 hover:border-brand-primary/30 hover:bg-brand-primary/5 transition text-brand-ink dark:text-white font-poppins"
          >{{ s }}</button>
        </div>
      </div>
    </div>
  </aside>
</template>
