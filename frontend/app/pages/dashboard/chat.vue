<script setup lang="ts">
import { useAuthStore } from '~~/stores/auth'
import type { ChatSession, ChatMessage } from '~/common/types/dashboard-types'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const authStore = useAuthStore()
const userInitial = computed(() => {
  const name = authStore.getUser?.username ?? authStore.getUser?.email ?? 'U'
  return name.charAt(0).toUpperCase()
})

const sessions: ChatSession[] = [
  { id: 1, title: 'Small-talk at work',        when: 'Now',       active: true,  preview: 'So what did you do this weekend?' },
  { id: 2, title: 'Ordering coffee in London', when: 'Yesterday',              preview: 'A flat white, please.' },
  { id: 3, title: 'Job interview prep',        when: '2d',                     preview: 'Tell me about yourself.' },
  { id: 4, title: 'Travel: Erbil trip',        when: '3d',                     preview: 'The citadel was stunning.' },
  { id: 5, title: 'Describing my family',      when: '1w',                     preview: 'I have two sisters and...' },
  { id: 6, title: 'News discussion',           when: '1w',                     preview: 'What do you think of AI?' },
]

const initialMessages: ChatMessage[] = [
  { who: 'ai',   text: "Welcome back! Today let's practice small-talk at work — the casual stuff that happens by the coffee machine.", time: '10:04' },
  { who: 'ai',   text: 'So, what did you do this weekend?', time: '10:04' },
  { who: 'user', text: 'I went to Erbil to see my family. It was very hot but beautiful.', time: '10:05' },
  { who: 'ai',   text: 'Nice! Two quick notes on that sentence — one tiny, one useful.', time: '10:05',
    correction: {
      original: 'It was very hot but beautiful.',
      suggested: 'It was really hot, but it was beautiful.',
      why: "In casual speech, 'really' sounds more natural than 'very', and repeating 'it was' keeps the rhythm.",
    },
  },
  { who: 'ai',   text: 'How did you spend time with them? Did you do anything specific?', time: '10:05' },
  { who: 'user', text: 'We visited the citadel and ate lots of food together.', time: '10:06' },
]

const messages = ref<ChatMessage[]>(initialMessages)
const input     = ref('')
const thinking  = ref(false)
const listRef   = ref<HTMLElement | null>(null)

function scrollBottom() {
  nextTick(() => {
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
  })
}

watch([messages, thinking], scrollBottom)
onMounted(scrollBottom)

function send() {
  if (!input.value.trim()) return
  messages.value.push({ who: 'user', text: input.value.trim(), time: '10:07' })
  input.value = ''
  thinking.value = true
  setTimeout(() => {
    thinking.value = false
    messages.value.push({ who: 'ai', text: 'That sounds lovely. What kind of food did you have? Tell me about your favourite dish.', time: '10:07' })
  }, 1600)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <!-- Full viewport minus the topbar (64px) -->
  <div class="flex h-full overflow-hidden animate-card-enter" style="--delay:0ms">

    <!-- ── Sessions sidebar ────────────────────────────────────────── -->
    <div class="w-65 border-r border-black/6 dark:border-white/6 bg-white dark:bg-[#0e0e10] hidden md:flex flex-col shrink-0">
      <!-- New session -->
      <div class="p-3 border-b border-black/6 dark:border-white/6">
        <AppButton variant="primary" size="36" radius="8" icon="Add" :icon-config="{color: 'white'}" text="New session" class="w-full justify-center text-[12.5px]!" />
      </div>
      <!-- Search -->
      <div class="px-3 pt-3">
        <div class="relative">
          <AppIconsax name="SearchNormal" color="#a1a1aa" :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search sessions"
            class="w-full pl-7 pr-2.5 py-1.5 text-[12px] rounded-lg bg-zinc-100 dark:bg-white/4 border border-transparent focus:border-brand-primary/30 outline-none text-brand-ink dark:text-white font-poppins"
          />
        </div>
      </div>
      <!-- Session list -->
      <div class="px-2.5 py-2 space-y-0.5 overflow-y-auto flex-1">
        <p class="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-400 px-2 py-1.5 font-poppins">Today</p>
        <DashboardChatSessionItem v-if="sessions[0]" :session="sessions[0]" />
        <p class="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-400 px-2 py-1.5 mt-2 font-poppins">Earlier</p>
        <DashboardChatSessionItem v-for="s in sessions.slice(1)" :key="s.id" :session="s" />
      </div>
    </div>

    <!-- ── Main thread ─────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Thread header -->
      <div class="h-14 border-b border-black/6 dark:border-white/6 flex items-center justify-between px-5 shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="relative">
            <div class="w-9 h-9 rounded-full bg-linear-to-br from-brand-primary to-brand-accent flex items-center justify-center text-black">
              <AppIconsax name="Candle" color="#000" :size="14" />
            </div>
            <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0e0e10]" />
          </div>
          <div class="leading-tight">
            <p class="text-[13px] font-semibold text-brand-ink dark:text-white font-poppins">Maya · AI Tutor</p>
            <p class="text-[10.5px] text-zinc-400 font-poppins">Small-talk at work · B2 · Casual</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition">
            <AppIconsax name="Volume" color="currentColor" :size="14" />
          </button>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition">
            <AppIconsax name="Refresh" color="currentColor" :size="14" />
          </button>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition">
            <AppIconsax name="CloseSquare" color="currentColor" :size="14" />
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div ref="listRef" class="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <div class="max-w-3xl mx-auto space-y-4">
          <DashboardChatMessageBubble
            v-for="(m, i) in messages"
            :key="i"
            :message="m"
            :user-initial="userInitial"
          />
          <DashboardChatThinkingIndicator v-if="thinking" />
        </div>
      </div>

      <!-- Composer -->
      <div class="border-t border-black/6 dark:border-white/6 p-4 shrink-0">
        <div class="max-w-3xl mx-auto">
          <div class="dash-card p-2.5 flex items-end gap-2">
            <button class="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-brand-ink dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition">
              <AppIconsax name="Paperclip" color="currentColor" :size="14" />
            </button>
            <textarea
              v-model="input"
              rows="1"
              placeholder="Type in English — or press the mic to speak"
              class="flex-1 resize-none outline-none bg-transparent py-2 px-1 text-[14px] text-brand-ink dark:text-white placeholder:text-zinc-400 font-poppins"
              @keydown="onKeydown"
            />
            <button class="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-white/6 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 transition">
              <AppIconsax name="Microphone" color="currentColor" :size="14" />
            </button>
            <AppButton variant="primary" size="36" radius="8" icon="Send" :icon-config="{color: 'white'}" text="Send" class="text-[12.5px]!" @click="send" />
          </div>
          <div class="flex items-center justify-between mt-2 px-1 text-[10.5px] text-zinc-400">
            <div class="flex items-center gap-3 font-poppins">
              <span class="flex items-center gap-1">
                <AppIconsax name="Candle" color="#a1a1aa" :size="10" />
                Corrections: on
              </span>
              <span>·</span>
              <span>Level: B2</span>
            </div>
            <span class="font-mono">Session 14:22 · 94% accuracy</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Live coaching pane ──────────────────────────────────────── -->
    <DashboardChatCoachPane />
  </div>
</template>
