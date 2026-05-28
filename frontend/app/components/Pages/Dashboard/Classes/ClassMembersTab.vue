<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ClassMember } from '~/common/types/class-types'

const props = defineProps<{
  classId: string
  members: ClassMember[]
  isTutorOrAdmin: boolean
  currentUserId: string
}>()

const emit = defineEmits<{ removed: [userId: string] }>()

const { removeMember } = useClasses()
const removingId = ref<string | null>(null)
const confirmUserId = ref<string | null>(null)

const tutors = computed(() => props.members.filter(m => m.role === 'TUTOR'))
const students = computed(() => props.members.filter(m => m.role === 'STUDENT'))

const roleColorClass: Record<string, string> = {
  TUTOR: 'bg-brand-primary/10 text-brand-primary',
  ADMIN: 'bg-red-500/10 text-red-500',
}

function avatarInitial(name: string) { return name.charAt(0).toUpperCase() }

async function confirmRemove(userId: string) {
  confirmUserId.value = userId
}

async function doRemove() {
  if (!confirmUserId.value) return
  const userId = confirmUserId.value
  confirmUserId.value = null
  removingId.value = userId
  const res = await removeMember(props.classId, userId)
  removingId.value = null
  if (!res.success) {
    toast.error(res.message || 'Could not remove member')
    return
  }
  const isSelf = userId === props.currentUserId
  toast.success(isSelf ? 'You left the class.' : 'Member removed.')
  emit('removed', userId)
}
</script>

<template>
  <div class="space-y-6">

    <!-- Confirm dialog -->
    <UiDialog :open="!!confirmUserId" @update:open="v => { if (!v) confirmUserId = null }">
      <UiDialogContent>
        <UiDialogHeader>
          <UiDialogTitle>Remove member?</UiDialogTitle>
          <UiDialogDescription>This will remove them from the class immediately. They can rejoin with the class code.</UiDialogDescription>
        </UiDialogHeader>
        <UiDialogFooter>
          <AppButton variant="secondary" size="36" radius="8" text="Cancel" @click="confirmUserId = null" />
          <AppButton variant="primary" size="36" radius="8" text="Remove" :icon-config="{ color: 'white' }" @click="doRemove" />
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>

    <!-- Tutors & Admins -->
    <div v-if="tutors.length">
      <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.18em] block mb-3" :style="`color:var(--text-subtle)`">
        Tutors & Admins ({{ tutors.length }})
      </AppText>
      <div class="space-y-0.5">
        <div
          v-for="m in tutors" :key="m.id"
          class="flex items-center gap-3 p-2.5 rounded-xl group"
          :onmouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'var(--surface-raised)'"
          :onmouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = ''"
        >
          <UiAvatar class="size-10 shrink-0">
            <UiAvatarImage v-if="m.user.avatarUrl" :src="m.user.avatarUrl" :alt="m.user.displayName" />
            <UiAvatarFallback class="text-[13px] font-semibold font-poppins" style="background:rgba(245,158,11,0.15);color:var(--color-brand-primary)">
              {{ avatarInitial(m.user.displayName || m.user.username) }}
            </UiAvatarFallback>
          </UiAvatar>
          <div class="flex-1 min-w-0">
            <AppText size="14" weight="medium" class-list="truncate block" :style="`color:var(--text-heading)`">{{ m.user.displayName || m.user.username }}</AppText>
            <AppText size="12" :style="`color:var(--text-muted)`">@{{ m.user.username }}</AppText>
          </div>
          <span :class="['text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full font-poppins shrink-0', roleColorClass[m.role] || '']">{{ m.role }}</span>
          <!-- Self-leave only for tutors, no kick -->
          <AppButton
            v-if="m.user.id === currentUserId"
            variant="secondary" size="28" radius="6"
            icon="Logout" :icon-config="{ color: '#ef4444', size: 13 }"
            :loading="removingId === m.user.id"
            class="opacity-0 group-hover:opacity-100 transition-opacity"
            @click="confirmRemove(m.user.id)"
          />
        </div>
      </div>
    </div>

    <!-- Students -->
    <div v-if="students.length">
      <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.18em] block mb-3" :style="`color:var(--text-subtle)`">
        Students ({{ students.length }})
      </AppText>
      <div class="space-y-0.5">
        <div
          v-for="m in students" :key="m.id"
          class="flex items-center gap-3 p-2.5 rounded-xl group"
          :onmouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'var(--surface-raised)'"
          :onmouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = ''"
        >
          <UiAvatar class="size-10 shrink-0">
            <UiAvatarImage v-if="m.user.avatarUrl" :src="m.user.avatarUrl" :alt="m.user.displayName" />
            <UiAvatarFallback class="text-[13px] font-semibold font-poppins" style="background:var(--surface-well);color:var(--text-muted)">
              {{ avatarInitial(m.user.displayName || m.user.username) }}
            </UiAvatarFallback>
          </UiAvatar>
          <div class="flex-1 min-w-0">
            <AppText size="14" weight="medium" class-list="truncate block" :style="`color:var(--text-heading)`">{{ m.user.displayName || m.user.username }}</AppText>
            <AppText size="12" :style="`color:var(--text-muted)`">@{{ m.user.username }}</AppText>
          </div>
          <span class="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full font-poppins shrink-0" style="background:var(--surface-well);color:var(--text-muted)">STUDENT</span>
          <AppButton
            v-if="isTutorOrAdmin || m.user.id === currentUserId"
            variant="secondary" size="28" radius="6"
            :icon="m.user.id === currentUserId ? 'Logout' : 'Trash'"
            :icon-config="{ color: '#ef4444', size: 13 }"
            :loading="removingId === m.user.id"
            class="opacity-0 group-hover:opacity-100 transition-opacity"
            @click="confirmRemove(m.user.id)"
          />
        </div>
      </div>
    </div>

    <div v-if="!members.length" class="text-center py-10">
      <AppIconsax name="People" color="var(--color-text-subtle)" :size="36" />
      <AppText size="14" class-list="block mt-2" :style="`color:var(--text-muted)`">No members yet</AppText>
    </div>

  </div>
</template>
