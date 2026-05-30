<script setup lang="ts">
import type { SvgBasedIconName } from '~/common/types/iconsax-types'

const props = defineProps<{
  modelValue: string
  sending: boolean
  thinking: boolean
  composerDisabled: boolean
  isSessionEnded: boolean
  hardCapReached: boolean
  subActive: boolean
  activeSessionId: string | null
  cefrLabel: string
  plan: string
  userMessageCount: number
  messagesPerSessionHard: number
  sessionTimer: string
  accuracyLabel: string
  hasMessages: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [val: string]
  'send': []
  'fill-suggestion': [text: string]
  'attach': []
  'mic': []
}>()

const suggestions: { icon: SvgBasedIconName; text: string }[] = [
  { icon: 'Messages2', text: "Let's practice small-talk at work." },
  { icon: 'Cup', text: 'Help me order coffee in English.' },
  { icon: 'Briefcase', text: 'Coach me for a job interview.' },
  { icon: 'Airplane', text: "Let's talk about planning a trip." },
  { icon: 'Book1', text: 'Correct my grammar as we chat.' },
  { icon: 'People', text: "Tell me about today's English idiom." },
]

const placeholder = computed(() => {
  if (!props.subActive) return 'Subscribe to chat with Tutelage AI...'
  if (props.isSessionEnded) return 'Session ended — start a new one.'
  if (props.hardCapReached) return 'Session message limit reached.'
  if (!props.activeSessionId) return "Type a message to start chatting with Tutelage AI…"
  return 'Ask Tutelage AI anything in English, or say hi to start a conversation!'
})

const textareaEl = ref<HTMLTextAreaElement | null>(null)
defineExpose({ textareaEl })

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('send')
  }
}
</script>

<template>
  <div class="border-t border-black/6 dark:border-white/6 p-4 shrink-0">
    <div class="max-w-3xl mx-auto">

      <!-- Suggestion chips (only when no messages yet) -->
      <div v-if="!hasMessages && subActive && !isSessionEnded" class="flex flex-wrap gap-1.5 mb-3">
        <button
          v-for="s in suggestions"
          :key="s.text"
          type="button"
          class="flex items-center gap-1 px-2.5 py-1 rounded-full border border-black/8 dark:border-white/8 bg-white dark:bg-white/4 hover:border-brand-primary/40 hover:bg-brand-primary/5 text-[11.5px] text-zinc-600 dark:text-zinc-300 font-poppins transition"
          @click="emit('fill-suggestion', s.text)"
        >
          <AppIconsax :name="s.icon" color="#a1a1aa" :size="11" />
          {{ s.text }}
        </button>
      </div>

      <div class="dash-card p-2.5 flex items-end gap-2">
        <button
          class="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-brand-ink dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition"
          title="Attachments — coming soon"
          @click="emit('attach')"
        >
          <AppIconsax name="Paperclip" color="currentColor" :size="14" />
        </button>
        <textarea
          ref="textareaEl"
          :value="modelValue"
          rows="1"
          :placeholder="placeholder"
          :disabled="composerDisabled"
          class="flex-1 resize-none outline-none bg-transparent py-2 overflow-hidden px-1 text-[14px] text-brand-ink dark:text-white placeholder:text-zinc-400 font-poppins disabled:cursor-not-allowed"
          @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          @keydown="onKeydown"
        />
        <button
          class="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-white/6 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 transition"
          title="Voice input — coming soon"
          @click="emit('mic')"
        >
          <AppIconsax name="Microphone" color="currentColor" :size="14" />
        </button>
        <AppButton
          variant="primary"
          size="36"
          radius="8"
          icon="Send"
          :icon-config="{ color: 'white' }"
          :text="sending ? 'Sending…' : 'Send'"
          class="text-[12.5px]!"
          :loading="sending"
          :disabled="composerDisabled || !modelValue.trim()"
          @click="emit('send')"
        />
      </div>

      <div class="flex items-center justify-between mt-2 px-1 text-[10.5px] text-zinc-400">
        <div class="flex items-center gap-3 font-poppins">
          <!-- <span class="flex items-center gap-1">
            <AppIconsax name="Candle" color="#a1a1aa" :size="10" />
            Corrections: on
          </span>
          <span>·</span> -->
          <span>Level: {{ cefrLabel }}</span>
          <span>·</span>
          <span>{{ plan }}</span>
        </div>
        <span class="font-mono">
          {{ userMessageCount }}/{{ messagesPerSessionHard }} msgs · {{ accuracyLabel }} token usage
        </span>
      </div>
    </div>
  </div>
</template>
