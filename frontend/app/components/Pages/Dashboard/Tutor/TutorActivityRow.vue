<script setup lang="ts">
import type { TutorDashboardData } from '~/common/types/tutor-types'

const props = defineProps<{
  item: TutorDashboardData['recentActivity'][number]
}>()

const initial = computed(() => props.item.displayName.charAt(0).toUpperCase())

const relativeTime = computed(() => {
  const diff = Date.now() - new Date(props.item.startedAt).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(diff / 3_600_000)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
})
</script>

<template>
  <AppLink
    :to="`/dashboard/users/${item.userId}`"
    class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
    :style="`background:var(--surface-raised)`"
  >
    <UiAvatar class="size-9 rounded-xl shrink-0">
      <UiAvatarImage v-if="item.avatarUrl" :src="item.avatarUrl" :alt="item.displayName" class="object-cover" />
      <UiAvatarFallback class="rounded-xl text-[13px] font-semibold font-poppins text-white" style="background:linear-gradient(135deg,var(--color-brand-primary),#b45309)">
        {{ initial }}
      </UiAvatarFallback>
    </UiAvatar>
    <div class="flex-1 min-w-0">
      <p class="text-[14px] font-semibold font-poppins truncate" :style="`color:var(--text-heading)`">{{ item.displayName }}</p>
      <p class="text-[13px] font-poppins truncate" :style="`color:var(--text-muted)`">{{ item.className }}</p>
    </div>
    <div class="text-right shrink-0">
      <div class="flex items-center gap-1.5 justify-end mb-0.5">
        <AppIconsax :name="item.sessionMode === 'VOICE' ? 'Microphone' : 'Messages'" color="var(--color-text-subtle)" :size="13" />
        <span class="text-[13px] font-poppins" :style="`color:var(--text-subtle)`">{{ item.sessionMode === 'VOICE' ? 'Voice' : 'Chat' }}</span>
      </div>
      <div class="flex items-center gap-2 justify-end">
        <span v-if="item.avgOverallScore !== null" class="text-[13px] font-semibold font-poppins" style="color:var(--color-brand-primary)">
          {{ item.avgOverallScore }}%
        </span>
        <span class="text-[13px] font-poppins" :style="`color:var(--text-subtle)`">{{ relativeTime }}</span>
      </div>
    </div>
  </AppLink>
</template>
