<script setup lang="ts">
import type { ClassDetail } from '~/common/types/class-types'

const props = defineProps<{
  open: boolean
  cls: ClassDetail | null
  copying: boolean
  refreshing: boolean
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  copy: [code: string]
  refresh: [id: string]
  edit: [id: string]
  delete: [id: string]
}>()

function viewFullPage() {
  if (!props.cls) return
  emit('update:open', false)
  useRouter().push(`/dashboard/classes/${props.cls.id}`)
}

type Tab = 'members' | 'announcements'
const activeTab = ref<Tab>('members')

watch(() => props.cls?.id, () => { activeTab.value = 'members' })

const isExpired = computed(() => {
  if (!props.cls?.classCodeExpiresAt) return false
  return new Date(props.cls.classCodeExpiresAt) < new Date()
})

const isTutorOrAdmin = computed(() =>
  props.cls?.myRole === 'TUTOR' || props.cls?.myRole === 'ADMIN' || props.isAdmin,
)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtExpiry(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((d.getTime() - Date.now()) / 1000 / 60)
  if (diff < 0) return 'Expired'
  if (diff < 60) return `Expires in ${diff}m`
  if (diff < 1440) return `Expires in ${Math.floor(diff / 60)}h`
  return `Expires ${fmtDate(iso)}`
}

function avatarInitial(name: string) {
  return name.charAt(0).toUpperCase()
}

const roleColorClass: Record<string, string> = {
  TUTOR: 'bg-brand-primary/10 text-brand-primary',
  ADMIN: 'bg-red-500/10 text-red-500',
  STUDENT: '',
}

const statusConfig = computed(() => {
  if (props.cls?.classCodeBlocked) return { label: 'Blocked', icon: 'Lock' as const, style: 'color:var(--status-blocked-text)' }
  if (isExpired.value) return { label: 'Expired', icon: 'CloseCircle' as const, style: 'color:var(--status-expired-text)' }
  if (props.cls?.classCodeExpiresAt) return { label: fmtExpiry(props.cls.classCodeExpiresAt), icon: 'Clock' as const, style: 'color:var(--text-muted)' }
  return { label: 'Permanent', icon: 'Clock' as const, style: 'color:var(--text-muted)' }
})

const tutors = computed(() => props.cls?.members?.filter(m => m.role === 'TUTOR') ?? [])
const students = computed(() => props.cls?.members?.filter(m => m.role === 'STUDENT') ?? [])
</script>

<template>
  <UiSheet :open="open" @update:open="emit('update:open', $event)">
    <UiSheetContent side="right" class="w-full sm:max-w-105 p-0 gap-0 flex flex-col"
      :style="`background:var(--surface-card);border-left:1px solid var(--border-card)`">
      <!-- Loading state -->
      <template v-if="!cls">
        <div class="p-5 space-y-3" style="border-bottom:1px solid var(--border-inner)">
          <UiSkeleton class="h-10 w-10 rounded-xl" />
          <UiSkeleton class="h-4 w-48 rounded" />
          <UiSkeleton class="h-3 w-32 rounded" />
        </div>
        <div class="p-5 space-y-4">
          <UiSkeleton class="h-20 rounded-xl" />
          <UiSkeleton class="h-32 rounded-xl" />
        </div>
      </template>

      <template v-else>
        <!-- Header -->
        <UiSheetHeader class="p-5 pb-4 shrink-0" style="border-bottom:1px solid var(--border-inner)">
          <div class="flex items-start gap-3 pr-6">
            <div class="size-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2)">
              <AppIconsax name="BookSaved" color="var(--color-brand-primary)" :size="18" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 pr-2">
                <UiSheetTitle class="text-[16px] font-semibold leading-snug truncate flex-1"
                  :style="`color:var(--text-heading)`">{{ cls.className }}</UiSheetTitle>
              </div>
              <AppText v-if="cls.classCategory" size="12" color="neutral-400" class-list="block mt-0.5"
                :style="`color:var(--text-muted)`">{{ cls.classCategory }}</AppText>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 mt-2 flex-wrap">
                  <span class="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full font-poppins"
                    :style="cls.classStatus === 'ACTIVE'
                      ? 'background:var(--status-active-bg);color:var(--status-active-text)'
                      : 'background:var(--status-expired-bg);color:var(--status-expired-text)'">{{ cls.classStatus
                      }}</span>
                  <span v-if="cls.myRole"
                    :class="['text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full font-poppins', roleColorClass[cls.myRole] || '']"
                    :style="!roleColorClass[cls.myRole] ? 'background:var(--surface-well);color:var(--text-muted)' : ''">{{
                      cls.myRole }}</span>
                </div>
                <button
                  class="shrink-0 flex items-center gap-1 px-3 py-2 text-base rounded-lg text-[11px] font-semibold font-poppins transition-colors"
                  style="color:var(--color-brand-primary);background:rgba(245,158,11,0.08)" title="Open full page"
                  @click="viewFullPage">
                  <AppIconsax name="Export" :size="16" color="var(--color-brand-primary)" />
                  Full page
                </button>
              </div>
            </div>
          </div>
        </UiSheetHeader>

        <!-- Quick stats + code block (always visible) -->
        <div class="px-5 py-4 space-y-4 shrink-0" style="border-bottom:1px solid var(--border-inner)">
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl p-3" style="background:var(--surface-raised);border:1px solid var(--border-inner)">
              <div class="flex items-center gap-2 mb-1">
                <AppIconsax name="People" color="var(--color-text-subtle)" :size="12" />
                <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]"
                  :style="`color:var(--text-subtle)`">Members</AppText>
              </div>
              <AppText size="20" weight="semibold" :style="`color:var(--text-heading)`">{{ cls.members.length }}
              </AppText>
            </div>
            <div class="rounded-xl p-3" style="background:var(--surface-raised);border:1px solid var(--border-inner)">
              <div class="flex items-center gap-2 mb-1">
                <AppIconsax name="Calendar" color="var(--color-text-subtle)" :size="12" />
                <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]"
                  :style="`color:var(--text-subtle)`">Created</AppText>
              </div>
              <AppText size="13" weight="semibold" :style="`color:var(--text-heading)`">{{ fmtDate(cls.createdAt) }}
              </AppText>
            </div>
          </div>

          <!-- Class code block (tutor/admin) -->
          <div v-if="isTutorOrAdmin" class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card)">
            <div class="px-4 py-3 flex items-center justify-between"
              style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
              <div class="flex items-center gap-2">
                <AppIconsax name="Key" color="var(--color-text-subtle)" :size="13" />
                <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]"
                  :style="`color:var(--text-subtle)`">Class code</AppText>
              </div>
              <div class="flex items-center gap-1.5">
                <AppIconsax :name="statusConfig.icon" :size="11" :style="statusConfig.style" />
                <AppText size="11" :style="statusConfig.style">{{ statusConfig.label }}</AppText>
              </div>
            </div>
            <div class="p-4 space-y-3" style="background:var(--surface-card)">
              <div class="flex items-center px-4 py-3 rounded-xl"
                style="background:var(--surface-raised);border:1px solid var(--border-inner)">
                <AppText size="18" weight="bold" font-family="mono"
                  class-list="flex-1 tracking-[0.35em] select-all text-center" :style="`color:var(--text-heading)`">
                  {{ cls.classCode }}
                </AppText>
              </div>
              <div class="flex items-center gap-2">
                <AppButton variant="secondary" size="36" radius="8" :icon="copying ? 'TickCircle' : 'Copy'"
                  :icon-config="{ color: copying ? 'var(--color-brand-primary)' : 'currentColor', size: 14 }"
                  text="Copy" class="flex-1" @click="cls && emit('copy', cls.classCode)" />
                <AppButton variant="secondary" size="36" radius="8" icon="Refresh2"
                  :icon-config="{ color: 'currentColor', size: 14 }" text="Rotate" class="flex-1" :loading="refreshing"
                  @click="cls && emit('refresh', cls.id)" />
              </div>
            </div>
          </div>

          <!-- Tutor + admin CRUD actions -->
          <div v-if="isTutorOrAdmin" class="flex items-center gap-2">
            <AppButton variant="secondary" size="36" radius="8" icon="Edit2"
              :icon-config="{ color: 'currentColor', size: 14 }" text="Edit class" class="flex-1"
              @click="cls && emit('edit', cls.id)" />
            <AppButton v-if="isAdmin" variant="secondary" size="36" radius="8" icon="Trash"
              :icon-config="{ color: '#ef4444', size: 14 }" text="Delete" class="flex-1"
              @click="cls && emit('delete', cls.id)" />
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex shrink-0" style="border-bottom:1px solid var(--border-inner)">
          <button
            v-for="tab in ([{ key: 'members', label: 'Members', icon: 'People' }, { key: 'announcements', label: 'Announcements', icon: 'Notification' }] as const)"
            :key="tab.key"
            class="flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold font-poppins transition-colors relative"
            :style="activeTab === tab.key
              ? 'color:var(--color-brand-primary)'
              : 'color:var(--text-muted)'" @click="activeTab = tab.key">
            <AppIconsax :name="tab.icon" :size="13"
              :color="activeTab === tab.key ? 'var(--color-brand-primary)' : 'var(--color-text-muted)'" />
            {{ tab.label }}
            <span v-if="activeTab === tab.key"
              class="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-brand-primary" />
          </button>
        </div>

        <!-- Tab body -->
        <div class="flex-1 overflow-y-auto p-5">

          <!-- Members tab -->
          <template v-if="activeTab === 'members'">
            <div class="space-y-5">
              <div v-if="tutors.length > 0">
                <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.18em] block mb-3"
                  :style="`color:var(--text-subtle)`">
                  Tutors & Admins ({{ tutors.length }})
                </AppText>
                <div class="space-y-0.5">
                  <div v-for="m in tutors" :key="m.id"
                    class="flex items-center gap-3 p-2.5 rounded-xl transition-colors" style="cursor:default"
                    :onmouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'var(--surface-raised)'"
                    :onmouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = ''">
                    <UiAvatar class="size-9 shrink-0">
                      <UiAvatarImage v-if="m.user.avatarUrl" :src="m.user.avatarUrl" :alt="m.user.displayName" />
                      <UiAvatarFallback class="text-[12px] font-semibold font-poppins"
                        style="background:rgba(245,158,11,0.15);color:var(--color-brand-primary)">
                        {{ avatarInitial(m.user.displayName || m.user.username) }}
                      </UiAvatarFallback>
                    </UiAvatar>
                    <div class="flex-1 min-w-0">
                      <AppText size="13" weight="medium" class-list="truncate block"
                        :style="`color:var(--text-heading)`">{{ m.user.displayName || m.user.username }}</AppText>
                      <AppText size="11" :style="`color:var(--text-muted)`">@{{ m.user.username }}</AppText>
                    </div>
                    <span
                      :class="['text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full font-poppins shrink-0', roleColorClass[m.role] || '']">{{
                        m.role }}</span>
                  </div>
                </div>
              </div>

              <div v-if="students.length > 0">
                <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.18em] block mb-3"
                  :style="`color:var(--text-subtle)`">
                  Students ({{ students.length }})
                </AppText>
                <div class="space-y-0.5">
                  <div v-for="m in students" :key="m.id"
                    class="flex items-center gap-3 p-2.5 rounded-xl transition-colors" style="cursor:default"
                    :onmouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'var(--surface-raised)'"
                    :onmouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = ''">
                    <UiAvatar class="size-9 shrink-0">
                      <UiAvatarImage v-if="m.user.avatarUrl" :src="m.user.avatarUrl" :alt="m.user.displayName" />
                      <UiAvatarFallback class="text-[12px] font-semibold font-poppins"
                        style="background:var(--surface-well);color:var(--text-muted)">
                        {{ avatarInitial(m.user.displayName || m.user.username) }}
                      </UiAvatarFallback>
                    </UiAvatar>
                    <div class="flex-1 min-w-0">
                      <AppText size="13" weight="medium" class-list="truncate block"
                        :style="`color:var(--text-heading)`">{{ m.user.displayName || m.user.username }}</AppText>
                      <AppText size="11" :style="`color:var(--text-muted)`">@{{ m.user.username }}</AppText>
                    </div>
                    <span
                      class="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full font-poppins shrink-0"
                      style="background:var(--surface-well);color:var(--text-muted)">STUDENT</span>
                  </div>
                </div>
              </div>

              <div v-if="!cls.members?.length" class="text-center py-8">
                <AppIconsax name="People" color="var(--color-text-subtle)" :size="32" />
                <AppText size="13" class-list="block mt-2" :style="`color:var(--text-muted)`">No members yet</AppText>
              </div>
            </div>
          </template>

          <!-- Announcements tab -->
          <template v-else-if="activeTab === 'announcements'">
            <PagesDashboardClassesAnnouncementsFeed :class-id="cls.id" :can-post="isTutorOrAdmin ?? false" />
          </template>

        </div>
      </template>
    </UiSheetContent>
  </UiSheet>
</template>
