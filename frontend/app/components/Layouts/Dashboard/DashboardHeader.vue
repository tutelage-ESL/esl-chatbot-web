<script setup lang="ts">
import type { SvgBasedIconName } from '~/common/types/iconsax-types'
import { useAuthStore } from '~~/stores/auth'

const emit = defineEmits<{ 'open-sidebar': [] }>()
const isAdmin = computed(() => useAuthStore().getUser?.role === 'ADMIN')

const route = useRoute()

const pageTitles: Record<string, string> = {
  '/dashboard':          'Overview',
  '/dashboard/chat':     'AI Chat',
  '/dashboard/voice':    'Voice Lab',
  '/dashboard/vocab':    'Vocabulary',
  '/dashboard/goals':    'Goals',
  '/dashboard/lessons':  'Lessons',
  '/dashboard/profile':  'Profile',
  '/dashboard/billing': 'Billing',
}

const pageTitle = computed(() => pageTitles[route.path] ?? 'Dashboard')
const pageSlug  = computed(() => pageTitle.value.toLowerCase())

// Command palette
const cmdOpen = ref(false)
const cmdQuery = ref('')
const cmdInput = ref<HTMLInputElement | null>(null)

const navActions: { label: string; icon: SvgBasedIconName; to: string }[] = [
  { label: 'Overview',   icon: 'Category',    to: '/dashboard' },
  { label: 'AI Chat',    icon: 'MessageText', to: '/dashboard/chat' },
  { label: 'Voice Lab',  icon: 'Microphone2', to: '/dashboard/voice' },
  { label: 'Vocabulary', icon: 'Book1',       to: '/dashboard/vocab' },
  { label: 'Goals',      icon: 'Flag',        to: '/dashboard/goals' },
  { label: 'Lessons',    icon: 'Teacher',     to: '/dashboard/lessons' },
  { label: 'Profile',    icon: 'Profile',     to: '/dashboard/profile' },
  { label: 'Billing',    icon: 'Wallet2',     to: '/dashboard/billing' },
]

const filteredActions = computed(() => {
  const q = cmdQuery.value.trim().toLowerCase()
  if (!q) return navActions
  return navActions.filter(a => a.label.toLowerCase().includes(q))
})

function openCmd() {
  cmdOpen.value = true
  cmdQuery.value = ''
  nextTick(() => cmdInput.value?.focus())
}

function closeCmd() {
  cmdOpen.value = false
  cmdQuery.value = ''
}

const router = useRouter()
function selectAction(to: string) {
  closeCmd()
  router.push(to)
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    cmdOpen.value ? closeCmd() : openCmd()
  }
  if (e.key === 'Escape' && cmdOpen.value) closeCmd()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header
    class="h-16 flex items-center justify-between px-5 sm:px-7 border-b border-black/6 dark:border-white/6 bg-white/70 dark:bg-[#0e0e10]/70 backdrop-blur sticky top-0 z-30 shrink-0"
  >
    <!-- Left: burger (mobile) + breadcrumb -->
    <div class="flex items-center gap-3">
      <!-- Mobile burger -->
      <button
        class="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-brand-ink dark:hover:text-white transition"
        aria-label="Open sidebar"
        @click="emit('open-sidebar')"
      >
        <AppIconsax name="HambergerMenu" color="currentColor" :size="18" />
      </button>

      <UiBreadcrumb>
        <UiBreadcrumbList class="text-[11px] font-mono flex-nowrap gap-1 sm:gap-1.5">
          <UiBreadcrumbItem>
            <UiBreadcrumbLink as="span" class="text-zinc-400 cursor-default">app</UiBreadcrumbLink>
          </UiBreadcrumbItem>
          <UiBreadcrumbSeparator />
          <UiBreadcrumbItem>
            <UiBreadcrumbPage class="text-brand-ink dark:text-white font-mono text-[11px]">{{ pageSlug }}</UiBreadcrumbPage>
          </UiBreadcrumbItem>
        </UiBreadcrumbList>
      </UiBreadcrumb>
    </div>

    <!-- Search bar (md+) -->
    <div class="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8">
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] bg-zinc-100 dark:bg-white/4 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-white/7 transition"
        @click="openCmd"
      >
        <AppIconsax name="SearchNormal" color="currentColor" :size="13" />
        <span>Search lessons, words, sessions…</span>
        <kbd class="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-black/30 border border-black/5 dark:border-white/10">
          ⌘K
        </kbd>
      </button>
    </div>

    <!-- Right actions -->
    <div class="flex items-center gap-1.5">
      <!-- Notifications -->
      <LayoutsDashboardNotificationBell />

      <!-- Admin settings cog — admin only -->
      <NuxtLink v-if="isAdmin" to="/dashboard/admin">
        <button
          class="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-brand-ink dark:hover:text-white transition cursor-pointer"
          aria-label="Platform dashboard"
        >
          <AppIconsax name="Setting2" color="currentColor" :size="20" />
        </button>
      </NuxtLink>

      <!-- New session CTA -->
      <NuxtLink to="/dashboard/chat">
        <AppButton
          variant="primary"
          size="36"
          radius="8"
          icon="Candle"
          :icon-config="{ color: 'white' }"
          text="New session"
          class="hidden sm:flex text-[12.5px]!"
        />
      </NuxtLink>

      <!-- User avatar popup -->
      <BlockUserAvatar />
    </div>
  </header>

  <!-- Command Palette -->
  <Teleport to="body">
    <Transition name="cmd-fade">
      <div
        v-if="cmdOpen"
        class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
        @click.self="closeCmd"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeCmd" />

        <div class="relative w-full max-w-lg bg-white dark:bg-[#111113] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.22)] border border-black/6 dark:border-white/6 overflow-hidden animate-cmd-enter">
          <div class="flex items-center gap-3 px-4 py-3.5 border-b border-black/6 dark:border-white/6">
            <AppIconsax name="SearchNormal" color="currentColor" :size="15" class="text-zinc-400 shrink-0" />
            <input
              ref="cmdInput"
              v-model="cmdQuery"
              type="text"
              placeholder="Search pages, lessons, words…"
              class="flex-1 bg-transparent text-[13.5px] text-brand-ink dark:text-white placeholder:text-zinc-400 outline-none"
            />
            <kbd class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/6 border border-black/5 dark:border-white/10 text-zinc-400 shrink-0">
              Esc
            </kbd>
          </div>

          <div class="py-2 max-h-72 overflow-y-auto">
            <p v-if="filteredActions.length === 0" class="px-4 py-6 text-center text-[12.5px] text-zinc-400">
              No results for "{{ cmdQuery }}"
            </p>

            <template v-else>
              <p class="px-4 pb-1 pt-1 text-[10.5px] uppercase tracking-[0.16em] font-semibold text-zinc-400">
                Navigation
              </p>
              <button
                v-for="action in filteredActions"
                :key="action.to"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-white/4 transition group"
                :class="route.path === action.to ? 'bg-brand-primary/5' : ''"
                @click="selectAction(action.to)"
              >
                <div
                  class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition"
                  :class="route.path === action.to
                    ? 'bg-brand-primary/15 text-brand-primary'
                    : 'bg-zinc-100 dark:bg-white/4 text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-white/6'"
                >
                  <AppIconsax :name="action.icon" color="currentColor" :size="13" />
                </div>
                <span
                  class="text-[13px] font-medium"
                  :class="route.path === action.to ? 'text-brand-primary' : 'text-brand-ink dark:text-white'"
                >
                  {{ action.label }}
                </span>
                <AppIconsax
                  name="ArrowRight"
                  color="currentColor"
                  :size="11"
                  class="ml-auto text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition"
                />
              </button>
            </template>
          </div>

          <div class="px-4 py-2.5 border-t border-black/6 dark:border-white/6 flex items-center gap-3 text-[10.5px] text-zinc-400">
            <span><kbd class="font-mono px-1 py-0.5 rounded bg-zinc-100 dark:bg-white/6 border border-black/5 dark:border-white/10 text-[10px]">↵</kbd> select</span>
            <span><kbd class="font-mono px-1 py-0.5 rounded bg-zinc-100 dark:bg-white/6 border border-black/5 dark:border-white/10 text-[10px]">Esc</kbd> close</span>
            <span class="ml-auto"><kbd class="font-mono px-1 py-0.5 rounded bg-zinc-100 dark:bg-white/6 border border-black/5 dark:border-white/10 text-[10px]">⌘K</kbd> toggle</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cmd-fade-enter-active,
.cmd-fade-leave-active {
  transition: opacity 0.15s ease;
}
.cmd-fade-enter-from,
.cmd-fade-leave-to {
  opacity: 0;
}

@keyframes cmd-enter {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-cmd-enter {
  animation: cmd-enter 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
}
</style>
