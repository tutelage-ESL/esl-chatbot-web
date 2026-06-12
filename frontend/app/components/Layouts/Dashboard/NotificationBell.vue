<script setup lang="ts">
import { useNotifications } from '~/composables/useNotifications'
import { notificationRoute } from '~/common/data/notification-routes'
import type { Notification } from '~/common/model/notification'

const {
  notifications, unreadCount, loading,
  fetchNotifications, markAllRead, markOneRead,
  connectSocket, disconnectSocket,
} = useNotifications()

const open = ref(false)
const marking = ref(false)

onMounted(async () => {
  connectSocket()
  await fetchNotifications()
})

onUnmounted(() => {
  disconnectSocket()
})

async function onOpen() {
  open.value = true
  await fetchNotifications()
}

function onClose() {
  open.value = false
}

async function onMarkAllRead() {
  marking.value = true
  await markAllRead()
  marking.value = false
}

function onSelect(n: Notification) {
  open.value = false
  markOneRead(n.id)
  navigateTo(notificationRoute(n))
}
</script>

<template>
  <UiDropdownMenu :open="open" @update:open="v => v ? onOpen() : onClose()">
    <UiDropdownMenuTrigger as-child>
      <button
        class="relative w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-brand-ink dark:hover:text-white transition cursor-pointer"
        aria-label="Notifications"
      >
        <AppIconsax name="Notification" color="currentColor" :size="22" />
        <span
          v-if="unreadCount > 0"
          class="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold font-mono text-white bg-brand-primary ring-2 ring-white dark:ring-[#0e0e10]"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>
    </UiDropdownMenuTrigger>

    <UiDropdownMenuContent align="end" class="w-80 p-0 overflow-hidden" :side-offset="8">
      <LayoutsDashboardNotificationPanel
        :notifications="notifications"
        :loading="loading"
        :marking="marking"
        @close="onClose"
        @mark-all-read="onMarkAllRead"
        @select="onSelect"
      />
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
