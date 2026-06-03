<script setup lang="ts">
import type { DashboardNavItem } from '~/common/types/dashboard-types'
import { useAuthStore } from '~~/stores/auth'

const authStore = useAuthStore()
const currentPlan = computed(() => authStore.getUser?.subscription?.plan ?? 'FREE')
const userRole = computed(() => authStore.getUser?.role ?? 'STUDENT')

const { getStats } = useVocabulary()
const vocabDueCount = ref<number | undefined>(undefined)

onMounted(async () => {
  const res = await getStats()
  if (res.success && res.data?.data) {
    vocabDueCount.value = res.data.data.dueToday || undefined
  }
})

const props = defineProps<{
  collapsed: boolean
  mobileOpen: boolean
}>()
const emit = defineEmits<{ toggle: []; 'close-mobile': [] }>()

const route = useRoute()

watch(() => route.path, () => {
  if (props.mobileOpen) emit('close-mobile')
})

const primaryNav = computed(() => {
  const all: DashboardNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'Chart', path: '/dashboard', badge: undefined },
    // Admin and Tutor also see Users
    ...(userRole.value === 'ADMIN'
      ? [{ id: 'users', label: 'Users', icon: 'People', path: '/dashboard/users', badge: undefined }]
      : []
    ),
    { id: 'chat', label: 'AI Chat', icon: 'Messages', path: '/dashboard/chat', badge: undefined },
    { id: 'classes', label: 'Classes', icon: 'BookSaved', path: '/dashboard/classes', badge: undefined },
    { id: 'lessons', label: 'Lessons', icon: 'Candle', path: '/dashboard/lessons', badge: undefined },
    { id: 'voice', label: 'Voice Lab', icon: 'Microphone', path: '/dashboard/voice', badge: undefined },
    { id: 'vocab', label: 'Vocabulary', icon: 'Book1', path: '/dashboard/vocab', badge: vocabDueCount.value },
    { id: 'goals', label: 'Goals', icon: 'Flag', path: '/dashboard/goals', badge: undefined },
    { id: 'billing', label: 'Billing', icon: 'Wallet2', path: '/dashboard/billing', badge: undefined },
  ]
  return all satisfies DashboardNavItem[]
})

function isActive(path: string) {
  if (path === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(path)
}
</script>

<template>
  <!-- Mobile overlay backdrop -->
  <Transition name="backdrop-fade">
    <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
      @click="emit('close-mobile')" />
  </Transition>

  <!-- Sidebar -->
  <aside :class="[
    'flex flex-col shrink-0 border-r border-black/6 dark:border-white/6',
    'bg-white dark:bg-[#0e0e10] transition-all duration-300',
    // Desktop: inline, collapsible
    'md:relative md:translate-x-0',
    collapsed ? 'md:w-17' : 'md:w-58',
    // Mobile: fixed overlay
    'fixed inset-y-0 left-0 z-50 w-58 md:z-auto',
    mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
  ]">
    <!-- Brand -->
    <div class="h-16 flex items-center gap-2.5 px-4 border-b border-black/6 dark:border-white/6 shrink-0">
      <!-- closing indicator -->
      <div
        class="w-8 h-8 rounded-[9px] bg-linear-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-[0_6px_16px_-6px_rgba(245,158,11,0.6)] shrink-0">
        <AppIconsax name="Candle" color="#000" :size="14" />
      </div>
      <Transition name="fade">
        <div v-if="!collapsed" class="leading-tight overflow-hidden flex-1">
          <div class="text-[14px] font-semibold tracking-tight text-brand-ink dark:text-white font-poppins">
            Tutelage <span class="text-brand-primary">AI</span>
          </div>
          <div class="text-[10px] text-zinc-400 font-mono">app.tutelage.ai</div>
        </div>
      </Transition>

      <!-- Mobile close button -->
      <button
        class="md:hidden ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-brand-ink dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition"
        aria-label="Close sidebar" @click="emit('close-mobile')">
        <AppIconsax name="CloseCircle" color="currentColor" :size="16" />
      </button>
    </div>

    <!-- Primary nav -->
    <nav class="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
      <Transition name="fade">
        <div v-if="!collapsed"
          class="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-400 px-2 mb-1.5 font-poppins">
          Workspace
        </div>
      </Transition>

      <NuxtLink v-for="item in primaryNav" :key="item.id" :to="item.path" :class="[
        'relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-poppins w-full transition-colors duration-200',
        isActive(item.path)
          ? 'bg-brand-primary/10 text-brand-ink dark:text-white font-medium'
          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/4 hover:text-brand-ink dark:hover:text-white',
      ]">
        <span v-if="isActive(item.path)" class="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-brand-primary" />
        <AppIconsax :name="item.icon as any" :color="isActive(item.path) ? '#f59e0b' : 'currentColor'" :size="15" />
        <Transition name="fade">
          <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
        </Transition>
        <Transition name="fade">
          <span v-if="!collapsed && item.badge"
            class="ml-auto text-[10px] grid place-content-center bg-brand-primary text-white font-semibold aspect-square rounded-full px-2 leading-5">
            {{ item.badge }}
          </span>
        </Transition>
      </NuxtLink>
    </nav>

    <!-- Upgrade card — FREE plan only, hidden when collapsed -->
    <Transition name="fade">
      <NuxtLink v-if="!collapsed && currentPlan === 'FREE'" to="/dashboard/billing"
        class="m-3 p-3.5 rounded-xl bg-linear-to-br from-[#151517] to-[#1e1e22] text-white relative overflow-hidden shrink-0 block group cursor-pointer">
        <div class="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-brand-primary/25 blur-2xl pointer-events-none" />
        <div class="relative">
          <div class="flex items-center gap-1.5 mb-1.5">
            <AppIconsax name="Crown1" color="var(--color-brand-primary)" :size="12" />
            <AppText size="10" weight="semibold" color="brand-primary" :uppercase="true"
              class-list="tracking-wider font-poppins">
              Free plan
            </AppText>
          </div>
          <AppText size="12" weight="medium" color="white" class-list="leading-snug font-poppins block">
            Unlock more sessions<br />and smarter AI.
          </AppText>
          <div
            class="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold font-poppins text-brand-primary group-hover:gap-2.5 transition-all">
            <span>Upgrade now</span>
            <AppIconsax name="ArrowRight" color="var(--color-brand-primary)" :size="11" />
          </div>
        </div>
      </NuxtLink>
    </Transition>

    <!-- Collapse toggle lives in the layout (dashboard.vue) to avoid stacking context clipping -->
  </aside>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 0.2s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}
</style>
