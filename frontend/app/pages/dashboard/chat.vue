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
const messageEntities = ref<ApiChatMessage[]>([])

const input = ref('')
const search = ref('')
const thinking = ref(false)
const sending = ref(false)
const ending = ref(false)
const creating = ref(false)
const sessionStartedAt = ref<number>(Date.now())

const threadRef = ref<{ scrollEl: HTMLElement | null } | null>(null)

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
const composerDisabled = computed(
  () => sending.value || thinking.value || isSessionEnded.value || hardCapReached.value || !subActive.value,
)

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
    return raw ? new Date(raw.createdAt).toDateString() === today : false
  })
})
const earlierList = computed(() => {
  const today = new Date().toDateString()
  return filteredSessions.value.filter((s) => {
    const raw = rawSessions.value.find((r) => r.id === s.id)
    return raw ? new Date(raw.createdAt).toDateString() !== today : false
  })
})

const sessionTimer = ref('00:00')
let timerHandle: ReturnType<typeof setInterval> | null = null

function fmtTimer() {
  if (!activeSession.value) { sessionTimer.value = '00:00'; return }
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
onBeforeUnmount(() => { if (timerHandle) clearInterval(timerHandle) })

// ─── Helpers ───────────────────────────────────────────────────────────────
function scrollBottom() {
  nextTick(() => {
    const el = threadRef.value?.scrollEl
    if (el) el.scrollTop = el.scrollHeight
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
  if (!res.success) { toast.error(res.message || 'Could not load session'); return }
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

  const nowIso = new Date().toISOString()
  messages.value.push({ who: 'user', text, time: fmtTime(nowIso) })
  messageEntities.value.push({ id: `tmp-${Date.now()}`, role: 'USER', type: 'TEXT', content: text, createdAt: nowIso })

  sending.value = true
  thinking.value = true

  const res = await sendMessage(activeSessionId.value, text, 'TEXT')
  sending.value = false

  if (!res.success) {
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
  if (!payload) { thinking.value = false; return }

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
  if (!activeSessionId.value || ending.value || isSessionEnded.value) return
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
    toast.success(`Session ended · ${Math.round(e.avgOverallScore ?? 0)}/100 · CEFR ${e.detectedCefrLevel}`, { duration: 6000 })
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

function fillSuggestion(text: string) {
  input.value = text
  nextTick(() => document.querySelector<HTMLTextAreaElement>('textarea')?.focus())
}

onMounted(async () => {
  if (subActive.value) {
    await loadSessions(true)
  } else {
    toast.message('Activate a plan to start chatting with Maya.')
  }
})
</script>

<template>
  <!-- Full viewport minus the topbar — fixed three-column layout -->
  <div class="flex h-full overflow-hidden animate-card-enter" style="--delay:0ms">

    <!-- Sessions sidebar (fixed width, self-scrolling) -->
    <DashboardChatSessionsSidebar
      :sessions="sessions"
      :today-list="todayList"
      :earlier-list="earlierList"
      :creating="creating"
      :search="search"
      @new-session="newSession"
      @open-session="openSession"
      @update:search="search = $event"
    />

    <!-- Main thread (fills remaining space, column flex) -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

      <!-- Thread header (fixed height, never scrolls) -->
      <DashboardChatThreadHeader
        :topic="activeSession?.topic"
        :cefr-label="cefrLabel"
        :is-session-ended="isSessionEnded"
        :active-session-id="activeSessionId"
        :ending="ending"
        @voice="toast.message('Voice playback — coming soon')"
        @refresh="refreshCurrent"
        @end="endCurrent"
      />

      <!-- Message thread (scrollable, grows to fill) -->
      <DashboardChatMessageThread
        ref="threadRef"
        :messages="messages"
        :thinking="thinking"
        :sub-active="subActive"
        :active-session="activeSession"
        :user-initial="userInitial"
        @fill-suggestion="fillSuggestion"
      />

      <!-- Composer (fixed at bottom, never scrolls) -->
      <DashboardChatComposer
        v-model="input"
        :sending="sending"
        :thinking="thinking"
        :composer-disabled="composerDisabled"
        :is-session-ended="isSessionEnded"
        :hard-cap-reached="hardCapReached"
        :sub-active="subActive"
        :active-session-id="activeSessionId"
        :cefr-label="cefrLabel"
        :plan="plan"
        :user-message-count="userMessageCount"
        :messages-per-session-hard="limits.messagesPerSessionHard"
        :session-timer="sessionTimer"
        :accuracy-label="accuracyLabel"
        :has-messages="messages.length > 0"
        @send="send"
        @fill-suggestion="fillSuggestion"
        @attach="toast.message('Attachments — coming soon')"
        @mic="toast.message('Voice input — coming soon')"
      />
    </div>

    <!-- Live coaching pane (fixed width, right side) -->
    <DashboardChatCoachPane />
  </div>
</template>
