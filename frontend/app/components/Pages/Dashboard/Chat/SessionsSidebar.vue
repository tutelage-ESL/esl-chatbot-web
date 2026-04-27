<script setup lang="ts">
import type { ChatSession } from '~/common/types/dashboard-types'

defineProps<{
  sessions: ChatSession[]
  todayList: ChatSession[]
  earlierList: ChatSession[]
  creating: boolean
  search: string
}>()

const emit = defineEmits<{
  'new-session': []
  'open-session': [id: string | number]
  'update:search': [val: string]
}>()
</script>

<template>
  <div class="w-65 border-r border-black/6 dark:border-white/6 bg-white dark:bg-[#0e0e10] hidden md:flex flex-col shrink-0 overflow-hidden relative z-10">
    <!-- New session -->
    <div class="p-3 border-b border-black/6 dark:border-white/6 shrink-0">
      <AppButton
        variant="primary"
        size="36"
        radius="8"
        icon="Add"
        :icon-config="{ color: 'white' }"
        :text="creating ? 'Starting…' : 'New session'"
        class="w-full justify-center text-[12.5px]!"
        :loading="creating"
        @click="emit('new-session')"
      />
    </div>

    <!-- Search -->
    <div class="px-3 pt-3 shrink-0">
      <div class="relative">
        <AppIconsax name="SearchNormal" color="#a1a1aa" :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          :value="search"
          placeholder="Search sessions"
          class="w-full pl-7 pr-2.5 py-1.5 text-[12px] rounded-lg bg-zinc-100 dark:bg-white/4 border border-transparent focus:border-brand-primary/30 outline-none text-brand-ink dark:text-white font-poppins"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
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
          <PagesDashboardChatSessionItem
            v-for="s in todayList"
            :key="s.id"
            :session="s"
            @click="emit('open-session', s.id)"
          />
        </template>
        <template v-if="earlierList.length">
          <p class="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-400 px-2 py-1.5 mt-2 font-poppins">Earlier</p>
          <PagesDashboardChatSessionItem
            v-for="s in earlierList"
            :key="s.id"
            :session="s"
            @click="emit('open-session', s.id)"
          />
        </template>
      </template>
    </div>
  </div>
</template>
