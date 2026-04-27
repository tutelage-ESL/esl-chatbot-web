<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useAuthStore } from '~~/stores/auth'
import type { ChatSession, ChatMessage } from '~/common/types/dashboard-types'
import type {
  SessionListItem,
  SessionDetail,
  ChatMessage as ApiChatMessage,
} from '~/common/types/chat-types'
import { getLimits } from '~/common/data/plan-limits'
import type { SvgBasedIconName } from '~/common/types/iconsax-types'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const authStore = useAuthStore()
const { listSessions, createSession, getSession, sendMessage, endSession } = useSessions()

const userInitial = computed(() => {
  const name = authStore.getUser?.username ?? authStore.getUser?.email ?? 'U'
  return name.charAt(0).toUpperCase()
})

const plan = computed(() => authStore.getUser?.subscription?.plan ?? 'FREE')
const limits = computed(() => getLimits(plan.value))
const subActive = computed(() => authStore.getUser?.subscription?.status === 'ACTIVE')

// ─── State ─────────────────────────────────────────────────────────────────
const rawSessions = ref<SessionListItem[]>([])
const sessions = ref<ChatSession[]>([])
const activeSessionId = ref<string | null>(null)
const activeSession = ref<SessionDetail | null>(null)

const messages = ref<ChatMessage[]>([])
const messageEntities = ref<ApiChatMessage[]>([]) // raw, kept in sync with messages

const input = ref('')
const search = ref('')
const thinking = ref(false)
const sending = ref(false)
const ending = ref(false)
const creating = ref(false)
const sessionStartedAt = ref<number>(Date.now())

const listRef = ref<HTMLElement | null>(null)

// ─── Derived ───────────────────────────────────────────────────────────────
const userMessageCount = computed(() => messageEntities.value.filter((m) => m.role === 'USER').length)

const lastEval = computed(() => {
  for (let i = messageEntities.value.length - 1; i >= 0; i--) {
    const e = messageEntities.value[i]
    if (e?.role === 'USER' && e.evaluation) return e.evaluation
  }
  return null
})

const cefrLabel = computed(() => lastEval.value?.detectedCefrLevel ?? '—')
const accuracyLabel = computed(() => {
  const evals = messageEntities.value.filter((m) => m.role === 'USER' && m.evaluation).map((m) => m.evaluation!)
  if (!evals.length) return '—'
  const avg = evals.reduce((a, b) => a + (b.overallScore ?? 0), 0) / evals.length
  return `${Math.round(avg)}%`
})

const isSessionEnded = computed(() => !!activeSession.value?.endedAt)
const hardCapReached = computed(() => userMessageCount.value >= limits.value.messagesPerSessionHard)
// No activeSessionId check — user can type and it auto-creates a session
const composerDisabled = computed(
  () => sending.value || thinking.value || isSessionEnded.value || hardCapReached.value || !subActive.value,
)

const suggestions : { icon: SvgBasedIconName; text: string }[] = [
  { icon: 'Messages2', text: "Let's practice small-talk at work." },
  { icon: 'Cup', text: 'Help me order coffee in English.' },
  { icon: 'Briefcase', text: 'Coach me for a job interview.' },
  { icon: 'Airplane', text: "Let's talk about planning a trip." },
  { icon: 'Book1', text: 'Correct my grammar as we chat.' },
  { icon: 'People', text: "Tell me about today's English idiom." },
]

function fillSuggestion(text: string) {
  input.value = text
  nextTick(() => {
    const el = document.querySelector<HTMLTextAreaElement>('textarea')
    el?.focus()
  })
}

const todaysCount = computed(() => {
  const today = new Date().toDateString()
  return rawSessions.value.filter((s) => new Date(s.createdAt).toDateString() === today).length
})
const dailyLimitReached = computed(() => todaysCount.value >= limits.value.sessionsPerDay)

const filteredSessions = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return sessions.value
  return sessions.value.filter((s) => s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q))
})

const todayList = computed(() => {
  const today = new Date().toDateString()
  return filteredSessions.value.filter((s) => {
    const raw = rawSessions.value.find((r) => r.id === s.id)
    if (!raw) return false
    return new Date(raw.createdAt).toDateString() === today
  })
})
const earlierList = computed(() => {
  const today = new Date().toDateString()
  return filteredSessions.value.filter((s) => {
    const raw = rawSessions.value.find((r) => r.id === s.id)
    if (!raw) return false
    return new Date(raw.createdAt).toDateString() !== today
  })
})

const sessionTimer = ref('00:00')
let timerHandle: ReturnType<typeof setInterval> | null = null

function fmtTimer() {
  if (!activeSession.value) {
    sessionTimer.value = '00:00'
    return
  }
  const start = new Date(activeSession.value.startedAt).getTime() || sessionStartedAt.value
  const diff = Math.max(0, Math.floor((Date.now() - start) / 1000))
  const m = String(Math.floor(diff / 60)).padStart(2, '0')
  const s = String(diff % 60).padStart(2, '0')
  sessionTimer.value = `${m}:${s}`
}

watch(activeSessionId, () => {
  if (timerHandle) clearInterval(timerHandle)
  fmtTimer()
  timerHandle = setInterval(fmtTimer, 1000)
})
onBeforeUnmount(() => {
  if (timerHandle) clearInterval(timerHandle)
})

// ─── Helpers ───────────────────────────────────────────────────────────────
function scrollBottom() {
  nextTick(() => {
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
  })
}
watch([messages, thinking], scrollBottom, { deep: true })

function fmtTime(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtWhen(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const min = Math.floor((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'Now'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function toChatSession(s: SessionListItem): ChatSession {
  return {
    id: s.id,
    title: s.topic || 'Open conversation',
    when: fmtWhen(s.startedAt || s.createdAt),
    active: s.id === activeSessionId.value,
    preview: s.summary || (s.endedAt ? 'Session ended' : `${s.messageCount} messages`),
  }
}

function toChatMessage(m: ApiChatMessage): ChatMessage {
  const c = m.evaluation?.corrections?.[0]
  return {
    who: m.role === 'USER' ? 'user' : 'ai',
    text: m.content,
    time: fmtTime(m.createdAt),
    correction: c
      ? { original: c.original ?? '', suggested: c.corrected ?? '', why: c.explanation ?? '' }
      : undefined,
  }
}

function rebuildSessions() {
  sessions.value = rawSessions.value.map(toChatSession)
}

// Typewriter reveal for AI text
async function streamReveal(targetIndex: number, fullText: string) {
  const total = fullText.length
  const stepDelay = total > 400 ? 8 : total > 150 ? 14 : 22
  for (let i = 1; i <= total; i++) {
    if (!messages.value[targetIndex]) return
    messages.value[targetIndex].text = fullText.slice(0, i)
    if (i % 3 === 0) await new Promise((r) => setTimeout(r, stepDelay))
  }
}

// ─── API actions ───────────────────────────────────────────────────────────
async function loadSessions(autoPick = false) {
  const res = await listSessions({ limit: 30 })
  if (!res.success) return
  rawSessions.value = res.data?.data ?? []
  rebuildSessions()
  if (autoPick && !activeSessionId.value) {
    const firstActive = rawSessions.value.find((s) => !s.endedAt) ?? rawSessions.value[0]
    if (firstActive) await openSession(firstActive.id)
  }
}

async function openSession(id: string | number) {
  const sid = String(id)
  if (activeSessionId.value === sid && activeSession.value) return
  activeSessionId.value = sid
  const res = await getSession(sid)
  if (!res.success) {
    toast.error(res.message || 'Could not load session')
    return
  }
  const detail = res.data?.data
  if (!detail) return
  activeSession.value = detail
  sessionStartedAt.value = new Date(detail.startedAt).getTime() || Date.now()
  messageEntities.value = detail.messages ?? []
  messages.value = messageEntities.value.map(toChatMessage)
  rebuildSessions()
  scrollBottom()
}

async function newSession() {
  if (creating.value) return
  // if (!subActive.value) {
  //   toast.error('You need an active subscription to start a session.')
  //   return
  // }
  if (dailyLimitReached.value) {
    toast.error(`Daily session limit reached (${limits.value.sessionsPerDay}/day on ${plan.value}).`)
    return
  }
  creating.value = true
  const res = await createSession({ mode: 'TEXT', topic: null })
  creating.value = false
  if (!res.success) {
    if (res.status === 403) toast.error('You need an active subscription to start a session.')
    else if (res.status === 429) toast.error('Daily session limit reached.')
    else toast.error(res.message || 'Could not start session')
    return
  }
  const session = res.data?.data
  if (!session) return
  rawSessions.value = [session, ...rawSessions.value]
  activeSessionId.value = session.id
  activeSession.value = { ...session, messages: [], evaluation: null }
  messageEntities.value = []
  messages.value = []
  rebuildSessions()
}

async function send() {
  if (!input.value.trim() || composerDisabled.value) return
  const text = input.value.trim()
  input.value = ''

  // Auto-create a session if none is open yet
  if (!activeSessionId.value) {
    if (dailyLimitReached.value) {
      toast.error(`Daily session limit reached (${limits.value.sessionsPerDay}/day on ${plan.value}).`)
      input.value = text
      return
    }
    creating.value = true
    const res = await createSession({ mode: 'TEXT', topic: null })
    creating.value = false
    if (!res.success) {
      if (res.status === 403) toast.error('You need an active subscription to start a session.')
      else if (res.status === 429) toast.error('Daily session limit reached.')
      else toast.error(res.message || 'Could not start session')
      input.value = text
      return
    }
    const session = res.data?.data
    if (!session) { input.value = text; return }
    rawSessions.value = [session, ...rawSessions.value]
    activeSessionId.value = session.id
    activeSession.value = { ...session, messages: [], evaluation: null }
    messageEntities.value = []
    messages.value = []
    rebuildSessions()
  }

  // Optimistic user bubble
  const nowIso = new Date().toISOString()
  messages.value.push({ who: 'user', text, time: fmtTime(nowIso) })
  messageEntities.value.push({
    id: `tmp-${Date.now()}`,
    role: 'USER',
    type: 'TEXT',
    content: text,
    createdAt: nowIso,
  })

  sending.value = true
  thinking.value = true

  const res = await sendMessage(activeSessionId.value, text, 'TEXT')
  sending.value = false

  if (!res.success) {
    // remove pending bubbles (last user message)
    messages.value.pop()
    messageEntities.value.pop()
    thinking.value = false
    if (res.status === 429) toast.error(res.message || `Message limit reached (${limits.value.messagesPerSessionHard}).`)
    else if (res.status === 409) toast.error('This session has ended. Start a new one.')
    else if (res.status === 403) toast.error('Subscription required.')
    else toast.error(res.message || 'Could not send message')
    return
  }

  const payload = res.data?.data
  if (!payload) {
    thinking.value = false
    return
  }

  // Replace the temp user entry with the real one (now carrying the evaluation)
  const userApi: ApiChatMessage = {
    id: payload.userMessage?.id ?? `u-${Date.now()}`,
    role: 'USER',
    type: 'TEXT',
    content: payload.userMessage?.content ?? text,
    wordCount: payload.userMessage?.wordCount,
    createdAt: payload.userMessage?.createdAt ?? nowIso,
    evaluation: payload.evaluation ?? null,
  }
  messageEntities.value[messageEntities.value.length - 1] = userApi
  messages.value[messages.value.length - 1] = toChatMessage(userApi)

  // Add AI message and stream-reveal it
  const aiText = payload.assistantMessage?.content ?? ''
  const aiApi: ApiChatMessage = {
    id: payload.assistantMessage?.id ?? `ai-${Date.now()}`,
    role: 'ASSISTANT',
    type: 'TEXT',
    content: aiText,
    createdAt: payload.assistantMessage?.createdAt ?? new Date().toISOString(),
  }
  messageEntities.value.push(aiApi)
  messages.value.push({ who: 'ai', text: '', time: fmtTime(aiApi.createdAt) })
  thinking.value = false
  await streamReveal(messages.value.length - 1, aiText)

  // Soft limit warning right at the threshold
  if (userMessageCount.value === limits.value.messagesPerSessionSoft) {
    const left = limits.value.messagesPerSessionHard - userMessageCount.value
    toast.message(`Heads up — ${left} message${left === 1 ? '' : 's'} left before the session cap.`)
  }
  if (limits.value.messagesPerDayHard && userMessageCount.value >= limits.value.messagesPerDayHard - 2) {
    const left = limits.value.messagesPerDayHard - userMessageCount.value
    if (left > 0) toast.message(`${left} daily message${left === 1 ? '' : 's'} left on ${plan.value}.`)
  }

  loadSessions()
}

async function endCurrent() {
  if (!activeSessionId.value || ending.value) return
  if (isSessionEnded.value) return
  ending.value = true
  const res = await endSession(activeSessionId.value)
  ending.value = false
  if (!res.success) {
    if (res.status === 409) toast.message('Session was already ended.')
    else toast.error(res.message || 'Could not end session')
    return
  }
  const data = res.data?.data
  if (!data) return
  if (activeSession.value) activeSession.value.endedAt = data.endedAt ?? new Date().toISOString()
  const e = data.evaluation
  if (e) {
    toast.success(
      `Session ended · ${Math.round(e.avgOverallScore ?? 0)}/100 · CEFR ${e.detectedCefrLevel}`,
      { duration: 6000 },
    )
  } else {
    toast.success('Session ended')
  }
  loadSessions()
}

async function refreshCurrent() {
  if (!activeSessionId.value) return
  await openSession(activeSessionId.value)
  toast.success('Refreshed')
}

function comingSoonVoice() {
  toast.message('Voice playback — coming soon')
}
function comingSoonAttach() {
  toast.message('Attachments — coming soon')
}
function comingSoonMic() {
  toast.message('Voice input — coming soon')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  if (subActive.value) {
    await loadSessions(true)
  } else {
    toast.message('Activate a plan to start chatting with Maya.')
  }
})
</script>

<template>
  <!-- Full viewport minus the topbar (64px) -->
  <div class="flex h-full overflow-hidden animate-card-enter" style="--delay:0ms">

    <!-- ── Sessions sidebar ────────────────────────────────────────── -->
    <div class="w-65 border-r border-black/6 dark:border-white/6 bg-white dark:bg-[#0e0e10] hidden md:flex flex-col shrink-0 relative z-10">
      <!-- New session -->
      <div class="p-3 border-b border-black/6 dark:border-white/6">
        <AppButton
          variant="primary"
          size="36"
          radius="8"
          icon="Add"
          :icon-config="{color: 'white'}"
          :text="creating ? 'Starting…' : 'New session'"
          class="w-full justify-center text-[12.5px]!"
          :loading="creating"
          @click="newSession"
        />
      </div>
      <!-- Search -->
      <div class="px-3 pt-3">
        <div class="relative">
          <AppIconsax name="SearchNormal" color="#a1a1aa" :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="search"
            placeholder="Search sessions"
            class="w-full pl-7 pr-2.5 py-1.5 text-[12px] rounded-lg bg-zinc-100 dark:bg-white/4 border border-transparent focus:border-brand-primary/30 outline-none text-brand-ink dark:text-white font-poppins"
          />
        </div>
      </div>
      <!-- Session list -->
      <div class="px-2.5 py-2 space-y-0.5 overflow-y-auto flex-1">
        <template v-if="!sessions.length">
          <p class="text-[11px] text-zinc-400 px-2 py-3 font-poppins">No sessions yet — start one to begin.</p>
        </template>
        <template v-else>
          <template v-if="todayList.length">
            <p class="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-400 px-2 py-1.5 font-poppins">Today</p>
            <DashboardChatSessionItem
              v-for="s in todayList"
              :key="s.id"
              :session="s"
              @click="openSession(s.id)"
            />
          </template>
          <template v-if="earlierList.length">
            <p class="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-400 px-2 py-1.5 mt-2 font-poppins">Earlier</p>
            <DashboardChatSessionItem
              v-for="s in earlierList"
              :key="s.id"
              :session="s"
              @click="openSession(s.id)"
            />
          </template>
        </template>
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
            <span :class="['absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#0e0e10]', isSessionEnded ? 'bg-zinc-400' : 'bg-emerald-400']" />
          </div>
          <div class="leading-tight">
            <p class="text-[13px] font-semibold text-brand-ink dark:text-white font-poppins">Maya · AI Tutor</p>
            <p class="text-[10.5px] text-zinc-400 font-poppins">
              {{ activeSession?.topic || 'Open conversation' }} · {{ cefrLabel }} · {{ isSessionEnded ? 'Ended' : 'Casual' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
            title="Voice playback"
            @click="comingSoonVoice"
          >
            <AppIconsax name="Volume" color="currentColor" :size="14" />
          </button>
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition disabled:opacity-40"
            title="Refresh"
            :disabled="!activeSessionId"
            @click="refreshCurrent"
          >
            <AppIconsax name="Refresh" color="currentColor" :size="14" />
          </button>
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500 transition disabled:opacity-40"
            :title="isSessionEnded ? 'Session ended' : 'End session'"
            :disabled="!activeSessionId || isSessionEnded || ending"
            @click="endCurrent"
          >
            <AppIconsax name="CloseSquare" color="currentColor" :size="14" />
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div ref="listRef" class="flex-1 overflow-y-auto px-6 py-6">
        <div class="max-w-3xl mx-auto space-y-4 h-full">

          <!-- Empty state — shown when no messages exist -->
          <div v-if="!messages.length" class="flex flex-col items-center justify-center h-full text-center animate-card-enter pb-4">
            <!-- Maya avatar -->
            <div class="relative mb-4">
              <div class="w-16 h-16 rounded-2xl bg-linear-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg">
                <AppIconsax name="Candle" color="#000" :size="26" />
              </div>
              <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0e0e10]" />
            </div>

            <h3 class="text-[17px] font-semibold text-brand-ink dark:text-white font-poppins mb-1">
              Hi{{ authStore.getUser?.displayName ? `, ${authStore.getUser.displayName.split(' ')[0]}` : '' }}! I'm Maya 👋
            </h3>
            <p class="text-[13px] text-zinc-500 dark:text-zinc-400 font-poppins max-w-sm">
              <template v-if="!subActive">
                You need an active plan to chat. Head to settings to subscribe.
              </template>
              <template v-else-if="activeSession">
                Say anything in English — I'll reply naturally and correct you as we go.
              </template>
              <template v-else>
                Type a message below or pick a topic to start a new conversation.
              </template>
            </p>

            <!-- Suggestion chips (only when sub is active) -->
            <div v-if="subActive" class="mt-5 flex flex-wrap gap-2 justify-center max-w-lg">
              <button
                v-for="s in suggestions"
                :key="s.text"
                type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-white/4 hover:border-brand-primary/40 hover:bg-brand-primary/5 text-[12px] text-zinc-600 dark:text-zinc-300 font-poppins transition animate-card-enter"
                style="--delay:80ms"
                @click="fillSuggestion(s.text)"
              >
                <AppIconsax :name="s.icon" color="#a1a1aa" :size="12" />
                {{ s.text }}
              </button>
            </div>

            <!-- No-sub CTA -->
            <AppButton
              v-if="!subActive"
              to="/dashboard/settings"
              variant="primary"
              size="38"
              radius="8"
              text="Choose a plan"
              icon="ArrowRight"
              :icon-config="{ color: 'white' }"
              icon-position="end"
              class="mt-5"
            />
          </div>

          <!-- Messages -->
          <template v-else>
            <DashboardChatMessageBubble
              v-for="(m, i) in messages"
              :key="i"
              :message="m"
              :user-initial="userInitial"
            />
            <DashboardChatThinkingIndicator v-if="thinking" />
          </template>
        </div>
      </div>

      <!-- Composer -->
      <div class="border-t border-black/6 dark:border-white/6 p-4 shrink-0">
        <div class="max-w-3xl mx-auto">

          <!-- Suggestion chips above the input (only when no messages yet) -->
          <div v-if="!messages.length && subActive && !isSessionEnded" class="flex flex-wrap gap-1.5 mb-3">
            <button
              v-for="s in suggestions"
              :key="s.text"
              type="button"
              class="flex items-center gap-1 px-2.5 py-1 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-white/4 hover:border-brand-primary/40 hover:bg-brand-primary/5 text-[11.5px] text-zinc-600 dark:text-zinc-300 font-poppins transition"
              @click="fillSuggestion(s.text)"
            >
              <AppIconsax :name="s.icon" color="#a1a1aa" :size="11" />
              {{ s.text }}
            </button>
          </div>

          <div class="dash-card p-2.5 flex items-end gap-2">
            <button
              class="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-brand-ink dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition"
              title="Attachments — coming soon"
              @click="comingSoonAttach"
            >
              <AppIconsax name="Paperclip" color="currentColor" :size="14" />
            </button>
            <textarea
              v-model="input"
              rows="1"
              :placeholder="!subActive ? 'Subscribe to chat with Maya…' : isSessionEnded ? 'Session ended — start a new one.' : hardCapReached ? 'Session message limit reached.' : !activeSessionId ? 'Type anything — I\'ll start a new session for you.' : 'Type in English — or press the mic to speak'"
              :disabled="composerDisabled"
              class="flex-1 resize-none outline-none bg-transparent py-2 overflow-hidden px-1 text-[14px] text-brand-ink dark:text-white placeholder:text-zinc-400 font-poppins disabled:cursor-not-allowed"
              @keydown="onKeydown"
            />
            <button
              class="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-white/6 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 transition"
              title="Voice input — coming soon"
              @click="comingSoonMic"
            >
              <AppIconsax name="Microphone" color="currentColor" :size="14" />
            </button>
            <AppButton
              variant="primary"
              size="36"
              radius="8"
              icon="Send"
              :icon-config="{color: 'white'}"
              :text="sending ? 'Sending…' : 'Send'"
              class="text-[12.5px]!"
              :loading="sending"
              :disabled="composerDisabled || !input.trim()"
              @click="send"
            />
          </div>
          <div class="flex items-center justify-between mt-2 px-1 text-[10.5px] text-zinc-400">
            <div class="flex items-center gap-3 font-poppins">
              <span class="flex items-center gap-1">
                <AppIconsax name="Candle" color="#a1a1aa" :size="10" />
                Corrections: on
              </span>
              <span>·</span>
              <span>Level: {{ cefrLabel }}</span>
              <span>·</span>
              <span>{{ plan }}</span>
            </div>
            <span class="font-mono">
              Session {{ sessionTimer }} · {{ userMessageCount }}/{{ limits.messagesPerSessionHard }} msgs · {{ accuracyLabel }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Live coaching pane ──────────────────────────────────────── -->
    <DashboardChatCoachPane />
  </div>
</template>
