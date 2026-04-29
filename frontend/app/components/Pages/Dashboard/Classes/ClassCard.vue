<script setup lang="ts">
import type { ClassItem } from '~/composables/useClasses'

const props = defineProps<{
  cls: ClassItem
  copying: boolean
}>()

const emit = defineEmits<{
  open: [id: string]
  copy: [code: string]
  refresh: [id: string]
}>()

const isExpired = computed(() => {
  if (!props.cls.classCodeExpiresAt) return false
  return new Date(props.cls.classCodeExpiresAt) < new Date()
})

const expiryLabel = computed(() => {
  if (!props.cls.classCodeExpiresAt) return 'No expiry'
  const d = new Date(props.cls.classCodeExpiresAt)
  if (isExpired.value) return 'Expired'
  const diff = Math.floor((d.getTime() - Date.now()) / 1000 / 60)
  if (diff < 60) return `Expires in ${diff}m`
  if (diff < 1440) return `Expires in ${Math.floor(diff / 60)}h`
  return `Expires in ${Math.floor(diff / 1440)}d`
})

const roleColorClass = computed(() => {
  if (props.cls.myRole === 'TUTOR') return 'text-brand-primary bg-brand-primary/10'
  if (props.cls.myRole === 'ADMIN') return 'text-red-500 bg-red-500/10'
  return 'text-zinc-500 bg-zinc-100 dark:bg-white/8 dark:text-zinc-300'
})

const codeStatusColor = computed(() => {
  if (props.cls.classCodeBlocked) return '#fb923c'
  if (isExpired.value) return '#f87171'
  return '#a1a1aa'
})
</script>

<template>
  <div
    class="dash-card p-5 flex flex-col gap-4 cursor-pointer hover:shadow-card transition-shadow"
    @click="emit('open', cls.id)"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
          <AppIconsax name="BookSaved" color="var(--color-brand-primary)" :size="17" />
        </div>
        <div class="min-w-0">
          <AppText size="14" weight="semibold" color="black" class-list="truncate block">{{ cls.className }}</AppText>
          <AppText v-if="cls.classCategory" size="11" color="neutral-400" class-list="truncate block">{{ cls.classCategory }}</AppText>
        </div>
      </div>
      <span :class="['shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full font-poppins', roleColorClass]">
        {{ cls.myRole ?? 'STUDENT' }}
      </span>
    </div>

    <!-- Stats row -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1">
        <AppIconsax name="People" color="#a1a1aa" :size="11" />
        <AppText size="11" color="neutral-400">{{ cls.memberCount }} member{{ cls.memberCount !== 1 ? 's' : '' }}</AppText>
      </div>
      <div class="flex items-center gap-1">
        <AppIconsax name="Calendar" color="#a1a1aa" :size="11" />
        <AppText size="11" color="neutral-400">
          {{ new Date(cls.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) }}
        </AppText>
      </div>
      <div class="flex items-center gap-1 ml-auto">
        <AppIconsax name="Clock" :color="codeStatusColor" :size="11" />
        <AppText
          size="11"
          :color="cls.classCodeBlocked ? 'neutral-400' : isExpired ? 'neutral-400' : 'neutral-400'"
          :class-list="cls.classCodeBlocked ? 'text-orange-400!' : isExpired ? 'text-red-400!' : ''"
        >
          {{ cls.classCodeBlocked ? 'Blocked' : expiryLabel }}
        </AppText>
      </div>
    </div>

    <!-- Code row (tutor/admin only) -->
    <div
      v-if="cls.myRole === 'TUTOR' || cls.myRole === 'ADMIN'"
      class="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-white/4 border border-black/5 dark:border-white/5"
      @click.stop
    >
      <AppText size="13" weight="semibold" font-family="mono" class-list="flex-1 tracking-widest select-all">
        {{ cls.classCode }}
      </AppText>
      <AppButton
        variant="secondary"
        size="28"
        radius="8"
        :icon="copying ? 'TickCircle' : 'Copy'"
        :icon-config="{ color: copying ? 'var(--color-brand-primary)' : 'currentColor', size: 13 }"
        @click.stop="emit('copy', cls.classCode)"
      />
      <AppButton
        variant="secondary"
        size="28"
        radius="8"
        icon="Refresh"
        :icon-config="{ color: 'currentColor', size: 13 }"
        @click.stop="emit('refresh', cls.id)"
      />
    </div>
  </div>
</template>
