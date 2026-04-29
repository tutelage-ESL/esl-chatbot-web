<script setup lang="ts">
import type { ClassDetail } from '~/composables/useClasses'

const props = defineProps<{
  open: boolean
  cls: ClassDetail | null
  copying: boolean
  refreshing: boolean
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  copy: [code: string]
  refresh: [id: string]
}>()

const isExpired = computed(() => {
  if (!props.cls?.classCodeExpiresAt) return false
  return new Date(props.cls.classCodeExpiresAt) < new Date()
})

const isTutorOrAdmin = computed(() =>
  props.cls?.myRole === 'TUTOR' || props.cls?.myRole === 'ADMIN',
)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function avatarInitial(name: string) {
  return name.charAt(0).toUpperCase()
}

const roleColorClass: Record<string, string> = {
  TUTOR: 'bg-brand-primary/10 text-brand-primary',
  ADMIN: 'bg-red-500/10 text-red-500',
  STUDENT: 'bg-zinc-100 dark:bg-white/8 text-zinc-500 dark:text-zinc-300',
}

const codeStatusColor = computed(() => {
  if (props.cls?.classCodeBlocked) return '#fb923c'
  if (isExpired.value) return '#f87171'
  return '#a1a1aa'
})

const codeStatusLabel = computed(() => {
  if (!props.cls) return ''
  if (props.cls.classCodeBlocked) return 'Code blocked'
  if (isExpired.value) return 'Code expired'
  if (props.cls.classCodeExpiresAt) return `Expires ${fmtDate(props.cls.classCodeExpiresAt)}`
  return 'No expiry'
})
</script>

<template>
  <UiSheet :open="open" @update:open="emit('update:open', $event)">
    <UiSheetContent
      side="right"
      class="w-full sm:max-w-105 p-0 gap-0 flex flex-col bg-white dark:bg-[#0e0e10] border-l border-black/6 dark:border-white/6"
    >
      <!-- Header -->
      <UiSheetHeader class="p-5 border-b border-black/6 dark:border-white/6 shrink-0">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <AppIconsax name="BookSaved" color="var(--color-brand-primary)" :size="17" />
          </div>
          <div class="flex-1 min-w-0">
            <UiSheetTitle class="truncate">{{ cls?.className }}</UiSheetTitle>
            <AppText v-if="cls?.classCategory" size="12" color="neutral-400" class-list="block">{{ cls.classCategory }}</AppText>
            <AppText size="11" color="neutral-400" class-list="mt-0.5 block">
              Created {{ cls ? fmtDate(cls.createdAt) : '' }} · {{ cls?.memberCount }} members
            </AppText>
          </div>
        </div>
      </UiSheetHeader>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5">

        <!-- Status badges -->
        <div class="flex items-center gap-2 flex-wrap">
          <span :class="['text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full font-poppins', cls?.classStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 dark:bg-white/8 text-zinc-400']">
            {{ cls?.classStatus }}
          </span>
          <span :class="['text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full font-poppins', roleColorClass[cls?.myRole ?? 'STUDENT']]">
            {{ cls?.myRole ?? 'STUDENT' }}
          </span>
        </div>

        <!-- Class code block (tutor/admin only) -->
        <div v-if="isTutorOrAdmin" class="dash-card p-4 space-y-3">
          <AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.18em]">Class code</AppText>
          <div class="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-white/4 border border-black/5 dark:border-white/5">
            <AppText size="15" weight="bold" font-family="mono" class-list="flex-1 tracking-[0.3em] select-all">
              {{ cls?.classCode }}
            </AppText>
            <AppButton
              variant="secondary"
              size="32"
              radius="8"
              :icon="copying ? 'TickCircle' : 'Copy'"
              :icon-config="{ color: copying ? 'var(--color-brand-primary)' : 'currentColor', size: 14 }"
              title="Copy code"
              @click="cls && emit('copy', cls.classCode)"
            />
            <AppButton
              variant="secondary"
              size="32"
              radius="8"
              icon="Refresh"
              :icon-config="{ color: 'currentColor', size: 14 }"
              title="Rotate code"
              :disabled="refreshing"
              @click="cls && emit('refresh', cls.id)"
            />
          </div>
          <div class="flex items-center gap-1.5">
            <AppIconsax name="Clock" :color="codeStatusColor" :size="11" />
            <AppText
              size="11"
              color="neutral-400"
              :class-list="cls?.classCodeBlocked ? 'text-orange-400!' : isExpired ? 'text-red-400!' : ''"
            >
              {{ codeStatusLabel }}
            </AppText>
          </div>
        </div>

        <!-- Members list -->
        <div>
          <AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.18em] block mb-3">
            Members ({{ cls?.members?.length ?? 0 }})
          </AppText>
          <div class="space-y-1">
            <div
              v-for="m in cls?.members"
              :key="m.id"
              class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/3 transition"
            >
              <UiAvatar class="size-8 shrink-0">
                <UiAvatarImage v-if="m.user.avatarUrl" :src="m.user.avatarUrl" :alt="m.user.displayName" />
                <UiAvatarFallback class="bg-brand-primary/15 text-brand-primary text-[13px] font-semibold font-poppins">
                  {{ avatarInitial(m.user.displayName || m.user.username) }}
                </UiAvatarFallback>
              </UiAvatar>

              <div class="flex-1 min-w-0">
                <AppText size="13" weight="medium" color="black" class-list="truncate block">
                  {{ m.user.displayName || m.user.username }}
                </AppText>
                <AppText size="11" color="neutral-400">@{{ m.user.username }}</AppText>
              </div>

              <span :class="['text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full font-poppins shrink-0', roleColorClass[m.role]]">
                {{ m.role }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </UiSheetContent>
  </UiSheet>
</template>
