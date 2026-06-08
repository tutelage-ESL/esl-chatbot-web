<script setup lang="ts">
import type { VoiceTurn } from '~/common/types/voice-types'

defineProps<{ open: boolean; turns: VoiceTurn[] }>()
const emit = defineEmits<{ 'update:open': [boolean] }>()
</script>

<template>
  <UiSheet :open="open" @update:open="emit('update:open', $event)">
    <UiSheetContent side="right" class="w-full gap-0 p-0 sm:max-w-md">
      <UiSheetHeader class="border-b border-border-inner px-5 py-4">
        <UiSheetTitle class="flex items-center gap-2">
          <AppIconsax name="DocumentText1" color="var(--color-brand-primary)" :size="18" />
          Conversation transcript
        </UiSheetTitle>
        <UiSheetDescription>
          A record of this call. Every turn you spoke, with its spoken score.
        </UiSheetDescription>
      </UiSheetHeader>

      <div class="h-[calc(100dvh-92px)] space-y-4 overflow-y-auto p-5">
        <UiEmpty v-if="!turns.length" class="h-full">
          <UiEmptyMedia variant="icon">
            <AppIconsax name="Microphone2" color="var(--color-brand-primary)" :size="24" />
          </UiEmptyMedia>
          <UiEmptyContent>
            <UiEmptyTitle>Nothing said yet</UiEmptyTitle>
            <UiEmptyDescription>Your spoken turns will appear here as the call goes on.</UiEmptyDescription>
          </UiEmptyContent>
        </UiEmpty>

        <PagesDashboardVoiceTurnRow v-for="turn in turns" :key="turn.id" :turn="turn" />
      </div>
    </UiSheetContent>
  </UiSheet>
</template>
