<script setup lang="ts">
import type { AddVocabularyInput } from '~/common/types/vocabulary-types'

const props = defineProps<{ open: boolean; adding?: boolean }>()
const emit = defineEmits<{
  'update:open': [val: boolean]
  submit: [input: AddVocabularyInput]
}>()

const form = reactive({
  word: '',
  definition: '',
  pronunciation: '',
  example: '',
  partOfSpeech: '',
  category: '',
})

watch(() => props.open, (open) => {
  if (open) {
    form.word = ''
    form.definition = ''
    form.pronunciation = ''
    form.example = ''
    form.partOfSpeech = ''
    form.category = ''
  }
})

const canSubmit = computed(() => form.word.trim().length > 0 && form.definition.trim().length > 0)

function submit() {
  if (!canSubmit.value || props.adding) return
  emit('submit', {
    word: form.word.trim(),
    definition: form.definition.trim(),
    pronunciation: form.pronunciation.trim() || undefined,
    example: form.example.trim() || undefined,
    partOfSpeech: form.partOfSpeech.trim() || undefined,
    category: form.category.trim() || undefined,
  })
}
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="p-0 gap-0 overflow-hidden max-w-md" style="background:var(--surface-card)">

      <!-- Header -->
      <UiDialogHeader class="p-6 pb-5" style="border-bottom:1px solid var(--border-inner)">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2)">
            <AppIconsax name="Add" color="var(--color-brand-primary)" :size="18" />
          </div>
          <div>
            <UiDialogTitle class="text-[16px] font-semibold leading-snug" style="color:var(--text-heading)">Add a word</UiDialogTitle>
          </div>
        </div>
      </UiDialogHeader>

      <!-- Body -->
      <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        <FormInput id="vocab-word" v-model="form.word" label="Word" placeholder="e.g. meticulous" required />
        <FormInput id="vocab-definition" v-model="form.definition" label="Definition" placeholder="Short meaning…" required />
        <div class="grid grid-cols-2 gap-3">
          <FormInput id="vocab-pronunciation" v-model="form.pronunciation" label="Pronunciation" placeholder="/məˈtɪkjələs/" />
          <FormInput id="vocab-partOfSpeech" v-model="form.partOfSpeech" label="Part of speech" placeholder="adjective" />
        </div>
        <FormInput id="vocab-example" v-model="form.example" label="Example sentence" placeholder="She's meticulous about her notes." />
        <FormInput id="vocab-category" v-model="form.category" label="Category" placeholder="e.g. Business, IELTS…" />
      </div>

      <!-- Footer -->
      <UiDialogFooter class="p-6 pt-4 gap-2" style="border-top:1px solid var(--border-inner)">
        <UiDialogClose as-child>
          <AppButton variant="secondary" size="40" radius="8" text="Cancel" class="flex-1" />
        </UiDialogClose>
        <AppButton
          variant="primary"
          size="40"
          radius="8"
          icon="Add"
          :icon-config="{ color: 'white', size: 16 }"
          text="Add word"
          class="flex-1"
          :loading="adding"
          :disabled="!canSubmit"
          @click="submit"
        />
      </UiDialogFooter>

    </UiDialogContent>
  </UiDialog>
</template>
