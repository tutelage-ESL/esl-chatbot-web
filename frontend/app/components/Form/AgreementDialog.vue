<script setup lang="ts">
import { useAgreement } from '~/composables/useAgreement'

const props = withDefaults(defineProps<{
  open: boolean
  mode?: 'view' | 'accept'
  loading?: boolean
}>(), {
  mode: 'view',
  loading: false,
})

const emit = defineEmits<{
  'update:open': [boolean]
  accept: []
}>()

const { agreement, loading: fetching, load } = useAgreement()

watch(() => props.open, (isOpen) => {
  if (isOpen && !agreement.value) load()
})

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderText(raw: string): string {
  return escapeHtml(raw)
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-5 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-6 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, ' ')
    .replace(/^/, '<p class="mb-2">')
    .replace(/$/, '</p>')
}
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      class="flex flex-col gap-0 p-0 max-w-2xl h-[80vh]"
      :show-close-button="false"
    >
      <UiDialogHeader class="px-6 pt-6 pb-4 border-b shrink-0">
        <UiDialogTitle>Terms of Service</UiDialogTitle>
        <UiDialogDescription v-if="agreement">
          Version {{ agreement.version }} — effective {{ agreement.effectiveDate }}
        </UiDialogDescription>
        <UiDialogDescription v-else-if="!fetching">
          Please read the Terms of Service below.
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="flex-1 overflow-y-auto px-6 py-4 text-sm text-brand-ink leading-relaxed min-h-0">
        <div v-if="fetching && !agreement" class="flex items-center justify-center py-16 text-brand-sub">
          Loading Terms of Service…
        </div>
        <div
          v-else-if="agreement"
          class="max-w-none"
          v-html="renderText(agreement.text)"
        />
        <div v-else class="text-center py-16 text-brand-sub">
          Could not load Terms of Service. Please try again later.
        </div>
      </div>

      <UiDialogFooter class="px-6 py-4 border-t shrink-0 flex gap-2 justify-end">
        <template v-if="mode === 'accept'">
          <AppButton
            variant="secondary"
            size="40"
            radius="8"
            text="Cancel"
            @click="emit('update:open', false)"
          />
          <AppButton
            variant="primary"
            size="40"
            radius="8"
            text="I Accept"
            :loading="loading"
            :disabled="!agreement || loading"
            @click="emit('accept')"
          />
        </template>
        <template v-else>
          <AppButton
            variant="secondary"
            size="40"
            radius="8"
            text="Close"
            @click="emit('update:open', false)"
          />
        </template>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
