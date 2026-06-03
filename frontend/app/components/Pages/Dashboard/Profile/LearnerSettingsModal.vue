<script setup lang="ts">
import type { MyLearnerProfile, UpdateLearnerProfileInput } from '~/common/types/profile-types'

const props = defineProps<{
  open: boolean
  learnerProfile: MyLearnerProfile | null
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  save: [input: UpdateLearnerProfileInput]
}>()

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
const PERSONALITIES = ['FRIENDLY', 'FORMAL', 'CASUAL', 'ENCOURAGING', 'STRICT', 'PATIENT'] as const
const PERSONALITY_LABEL: Record<string, string> = {
  FRIENDLY: 'Friendly',
  FORMAL: 'Formal',
  CASUAL: 'Casual',
  ENCOURAGING: 'Encouraging',
  STRICT: 'Strict',
  PATIENT: 'Patient',
}

const targetLevel = ref<string>('NONE')
const learningPurpose = ref('')
const aiPersonality = ref<string>('NONE')
const weeklyGoalMinutes = ref(210)
const topicInput = ref('')
const topics = ref<string[]>([])

watch(() => props.open, (v) => {
  if (!v) return
  const lp = props.learnerProfile
  targetLevel.value = lp?.targetLevel ?? 'NONE'
  learningPurpose.value = lp?.learningPurpose ?? ''
  aiPersonality.value = lp?.aiPersonality ?? 'NONE'
  weeklyGoalMinutes.value = lp?.weeklyGoalMinutes ?? 210
  topics.value = Array.isArray(lp?.topicsOfInterest) ? [...lp.topicsOfInterest] : []
}, { immediate: true })

function addTopic() {
  const t = topicInput.value.trim()
  if (t && !topics.value.includes(t)) topics.value.push(t)
  topicInput.value = ''
}

function removeTopic(t: string) {
  topics.value = topics.value.filter(x => x !== t)
}

function onTopicKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); addTopic() }
}

function submit() {
  emit('save', {
    targetLevel: targetLevel.value === 'NONE' ? null : targetLevel.value,
    learningPurpose: learningPurpose.value.trim() || null,
    aiPersonality: aiPersonality.value === 'NONE' ? null : aiPersonality.value,
    weeklyGoalMinutes: weeklyGoalMinutes.value,
    topicsOfInterest: topics.value,
  })
}

const dailyGoal = computed(() => Math.round(weeklyGoalMinutes.value / 7))
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="p-0 gap-0 overflow-hidden max-w-lg max-h-[90vh] flex flex-col"
      :style="`background:var(--surface-card)`">
      <UiDialogHeader class="p-6 pb-4 shrink-0">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-xl flex items-center justify-center shrink-0"
            style="background:var(--surface-raised)">
            <AppIconsax name="Setting2" color="var(--color-brand-primary)" :size="18" />
          </div>
          <div>
            <UiDialogTitle class="text-[18px] font-semibold font-poppins" :style="`color:var(--text-heading)`">
              Learning settings
            </UiDialogTitle>
            <UiDialogDescription class="text-[14px] font-poppins mt-0.5" :style="`color:var(--text-muted)`">
              Your CEFR level, AI tutor personality and weekly goal.
            </UiDialogDescription>
          </div>
        </div>
      </UiDialogHeader>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto px-6 pb-2 space-y-5">

        <div class="flex flex-wrap gap-4">
          <!-- Target level -->
          <div>
            <p class="text-[14px] font-medium font-poppins mb-1.5" :style="`color:var(--text-heading)`">Target level</p>
            <UiSelect v-model="targetLevel">
              <UiSelectTrigger class="text-[14px]">
                <UiSelectValue placeholder="Not set" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem value="NONE">Not set</UiSelectItem>
                <UiSelectItem v-for="l in CEFR" :key="l" :value="l">{{ l }}</UiSelectItem>
              </UiSelectContent>
            </UiSelect>
          </div>

          <!-- AI Personality -->
          <div>
            <p class="text-[14px] font-medium font-poppins mb-1.5" :style="`color:var(--text-heading)`">AI tutor
              personality</p>
            <UiSelect v-model="aiPersonality">
              <UiSelectTrigger class="text-[14px]">
                <UiSelectValue placeholder="Default" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem value="NONE">Default</UiSelectItem>
                <UiSelectItem v-for="p in PERSONALITIES" :key="p" :value="p">{{ PERSONALITY_LABEL[p] }}</UiSelectItem>
              </UiSelectContent>
            </UiSelect>
          </div>
        </div>

        <!-- Weekly goal -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <p class="text-[14px] font-medium font-poppins" :style="`color:var(--text-heading)`">Weekly goal</p>
            <span class="text-[14px] font-semibold font-poppins" style="color:var(--color-brand-primary)">
              {{ weeklyGoalMinutes }} min/week · {{ dailyGoal }} min/day
            </span>
          </div>
          <input v-model.number="weeklyGoalMinutes" type="range" min="35" max="840" step="35"
            class="w-full accent-brand-primary" />
          <div class="flex justify-between text-[14px] font-poppins mt-1" :style="`color:var(--text-subtle)`">
            <span>5 min/day</span>
            <span>2h/day</span>
          </div>
        </div>

        <!-- Learning purpose -->
        <div>
          <p class="text-[14px] font-medium font-poppins mb-1.5" :style="`color:var(--text-heading)`">Learning purpose
          </p>
          <UiTextarea v-model="learningPurpose" placeholder="e.g. Prepare for IELTS, work in an English-speaking team…"
            class="text-[14px] resize-none" rows="3" />
        </div>

        <!-- Topics of interest -->
        <div>
          <p class="text-[14px] font-medium font-poppins mb-1.5" :style="`color:var(--text-heading)`">Topics of interest
          </p>
          <div class="flex gap-2">
            <FormInput id="lp-topic" v-model="topicInput" placeholder="e.g. Technology, Travel…" class-list="flex-1"
              @keydown="onTopicKeydown" />
            <AppButton variant="secondary" size="40" radius="8" icon="Add" text="Add" @click="addTopic" />
          </div>
          <div v-if="topics.length" class="flex flex-wrap gap-2 mt-3">
            <span v-for="t in topics" :key="t"
              class="flex items-center gap-1.5 text-[14px] font-medium font-poppins px-3 py-1 rounded-full"
              style="background:var(--surface-raised);color:var(--text-heading)">
              {{ t }}
              <button type="button" class="cursor-pointer opacity-60 hover:opacity-100" @click="removeTopic(t)"
                aria-label="Remove">
                <AppIconsax name="CloseCircle" color="currentColor" :size="14" />
              </button>
            </span>
          </div>
        </div>
      </div>

      <UiDialogFooter class="p-6 pt-4 flex gap-2 shrink-0" style="border-top:1px solid var(--border-inner)">
        <UiDialogClose as-child>
          <AppButton variant="secondary" size="40" radius="8" text="Cancel" class="flex-1" />
        </UiDialogClose>
        <AppButton variant="primary" size="40" radius="8" icon="TickCircle" :icon-config="{ color: 'white', size: 16 }"
          text="Save settings" class="flex-1" :loading="saving" @click="submit" />
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
