<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ClassStudentSummary, ClassStudentDetail } from '~/common/types/class-types'
import type { AddVocabularyInput } from '~/common/types/vocabulary-types'
import { assignGoalToStudent, type CreateGoalInput } from '~/composables/useGoals'

const props = defineProps<{ classId: string }>()

const { getClassStudents, getClassStudentDetail } = useClasses()
const { assignVocabulary } = useVocabulary()

const students = ref<ClassStudentSummary[]>([])
const loading = ref(false)
const detailOpen = ref(false)
const detail = ref<ClassStudentDetail | null>(null)
const detailLoading = ref(false)

// Assign-vocabulary modal (tutor/admin gives a word to the open student)
const assignOpen = ref(false)
const assigning = ref(false)

async function handleAssignWord(input: AddVocabularyInput) {
  if (!detail.value || assigning.value) return
  assigning.value = true
  const res = await assignVocabulary(detail.value.userId, input)
  assigning.value = false
  if (!res.success) {
    if (res.status === 409) toast.error(res.message || 'The student already has that word.')
    else toast.error(res.message || 'Could not assign the word')
    return
  }
  assignOpen.value = false
  toast.success(`"${input.word}" assigned to ${detail.value.displayName || detail.value.username}.`)
  // Reflect the new word in the student's vocab total without a full reload.
  detail.value = { ...detail.value, vocabTotal: detail.value.vocabTotal + 1 }
}

// Assign-goal modal (reuses the shared GoalFormModal's create event)
const goalOpen = ref(false)
const assigningGoal = ref(false)

async function handleAssignGoal(input: CreateGoalInput) {
  if (!detail.value || assigningGoal.value) return
  assigningGoal.value = true
  const res = await assignGoalToStudent(detail.value.userId, input)
  assigningGoal.value = false
  if (!res.success) {
    toast.error(res.message || 'Could not assign the goal')
    return
  }
  goalOpen.value = false
  toast.success(`Goal assigned to ${detail.value.displayName || detail.value.username}.`)
}

async function load() {
  loading.value = true
  const res = await getClassStudents(props.classId)
  loading.value = false
  if (!res.success) { toast.error(res.message || 'Could not load students'); return }
  students.value = ((res.data as any)?.data ?? []) as ClassStudentSummary[]
}

async function openDetail(userId: string) {
  detailOpen.value = true
  detail.value = null
  detailLoading.value = true
  const res = await getClassStudentDetail(props.classId, userId)
  detailLoading.value = false
  if (!res.success) { toast.error(res.message || 'Could not load student'); return }
  detail.value = ((res.data as any)?.data) as ClassStudentDetail
}

function skillBar(val: number) {
  return Math.round(Math.min(100, Math.max(0, val)))
}

function fmtMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function avatarInitial(name: string) { return name.charAt(0).toUpperCase() }

watch(() => props.classId, () => load(), { immediate: true })
</script>

<template>
  <div>

    <!-- Student detail sheet -->
    <UiSheet :open="detailOpen" @update:open="detailOpen = $event">
      <UiSheetContent side="right" class="w-full sm:max-w-100 p-0 gap-0 flex flex-col" :style="`background:var(--surface-card);border-left:1px solid var(--border-card)`">
        <template v-if="detailLoading">
          <div class="p-5 space-y-3">
            <UiSkeleton class="size-14 rounded-2xl" />
            <UiSkeleton class="h-4 w-40 rounded" />
            <UiSkeleton class="h-3 w-28 rounded" />
          </div>
        </template>
        <template v-else-if="detail">
          <UiSheetHeader class="p-5 pb-4 shrink-0" style="border-bottom:1px solid var(--border-inner)">
            <div class="flex items-center gap-3 pr-6">
              <UiAvatar class="size-12 shrink-0">
                <UiAvatarImage v-if="detail.avatarUrl" :src="detail.avatarUrl" :alt="detail.displayName" />
                <UiAvatarFallback class="text-[15px] font-semibold font-poppins" style="background:rgba(245,158,11,0.15);color:var(--color-brand-primary)">
                  {{ avatarInitial(detail.displayName || detail.username) }}
                </UiAvatarFallback>
              </UiAvatar>
              <div class="flex-1 min-w-0">
                <UiSheetTitle class="text-[16px] font-semibold" :style="`color:var(--text-heading)`">{{ detail.displayName || detail.username }}</UiSheetTitle>
                <AppText size="12" :style="`color:var(--text-muted)`">@{{ detail.username }}</AppText>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-4">
              <AppButton
                variant="secondary"
                size="36"
                radius="8"
                icon="Book1"
                :icon-config="{ color: 'currentColor', size: 14 }"
                text="Assign word"
                class="flex-1"
                @click="assignOpen = true"
              />
              <AppButton
                variant="secondary"
                size="36"
                radius="8"
                icon="Flag"
                :icon-config="{ color: 'currentColor', size: 14 }"
                text="Assign goal"
                class="flex-1"
                @click="goalOpen = true"
              />
            </div>
          </UiSheetHeader>

          <div class="flex-1 overflow-y-auto p-5 space-y-5">

            <!-- Skills -->
            <div v-if="detail.metrics" class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card)">
              <div class="px-4 py-2.5 flex items-center gap-2" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
                <AppIconsax name="Chart" color="var(--color-text-subtle)" :size="12" />
                <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Skills</AppText>
              </div>
              <div class="p-4 space-y-3" style="background:var(--surface-card)">
                <div v-for="(val, key) in { Grammar: detail.metrics.grammarSkill, Vocabulary: detail.metrics.vocabularySkill, Fluency: detail.metrics.fluencySkill, Speaking: detail.metrics.speakingSkill }" :key="key">
                  <div class="flex items-center justify-between mb-1">
                    <AppText size="12" :style="`color:var(--text-body)`">{{ key }}</AppText>
                    <AppText size="12" weight="semibold" :style="`color:var(--text-heading)`">{{ skillBar(val) }}%</AppText>
                  </div>
                  <div class="h-1.5 rounded-full overflow-hidden" style="background:var(--surface-raised)">
                    <div class="h-full rounded-full bg-brand-primary transition-all" :style="`width:${skillBar(val)}%`" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-xl p-3" style="background:var(--surface-raised);border:1px solid var(--border-inner)">
                <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.12em] block mb-1" :style="`color:var(--text-subtle)`">Streak</AppText>
                <AppText size="18" weight="semibold" :style="`color:var(--text-heading)`">{{ detail.metrics?.currentStreak ?? 0 }}<span class="text-[13px] font-normal ml-0.5" style="color:var(--text-muted)">d</span></AppText>
              </div>
              <div class="rounded-xl p-3" style="background:var(--surface-raised);border:1px solid var(--border-inner)">
                <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.12em] block mb-1" :style="`color:var(--text-subtle)`">Study time</AppText>
                <AppText size="18" weight="semibold" :style="`color:var(--text-heading)`">{{ fmtMinutes(detail.metrics?.totalStudyTimeMinutes ?? 0) }}</AppText>
              </div>
              <div class="rounded-xl p-3" style="background:var(--surface-raised);border:1px solid var(--border-inner)">
                <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.12em] block mb-1" :style="`color:var(--text-subtle)`">Vocab total</AppText>
                <AppText size="18" weight="semibold" :style="`color:var(--text-heading)`">{{ detail.vocabTotal }}</AppText>
              </div>
              <div class="rounded-xl p-3" style="background:var(--surface-raised);border:1px solid var(--border-inner)">
                <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.12em] block mb-1" :style="`color:var(--text-subtle)`">Due today</AppText>
                <AppText size="18" weight="semibold" :style="`color:var(--text-heading)`">{{ detail.vocabDueToday }}</AppText>
              </div>
            </div>

            <!-- Learner profile -->
            <div v-if="detail.learnerProfile" class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card)">
              <div class="px-4 py-2.5 flex items-center gap-2" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
                <AppIconsax name="Profile" color="var(--color-text-subtle)" :size="12" />
                <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Profile</AppText>
              </div>
              <div class="p-4 space-y-2.5" style="background:var(--surface-card)">
                <div v-if="detail.learnerProfile.currentLevel" class="flex items-center justify-between">
                  <AppText size="12" :style="`color:var(--text-muted)`">Current level</AppText>
                  <AppText size="12" weight="semibold" :style="`color:var(--text-heading)`">{{ detail.learnerProfile.currentLevel }}</AppText>
                </div>
                <div v-if="detail.learnerProfile.targetLevel" class="flex items-center justify-between">
                  <AppText size="12" :style="`color:var(--text-muted)`">Target level</AppText>
                  <AppText size="12" weight="semibold" :style="`color:var(--text-heading)`">{{ detail.learnerProfile.targetLevel }}</AppText>
                </div>
                <div v-if="detail.metrics?.estimatedLevel" class="flex items-center justify-between">
                  <AppText size="12" :style="`color:var(--text-muted)`">AI estimate</AppText>
                  <AppText size="12" weight="semibold" :style="`color:var(--text-heading)`">{{ detail.metrics.estimatedLevel }}</AppText>
                </div>
                <div v-if="detail.learnerProfile.aiPersonality" class="flex items-center justify-between">
                  <AppText size="12" :style="`color:var(--text-muted)`">AI personality</AppText>
                  <AppText size="12" weight="semibold" :style="`color:var(--text-heading)`">{{ detail.learnerProfile.aiPersonality }}</AppText>
                </div>
                <div v-if="detail.learnerProfile.topicsOfInterest?.length" class="flex items-start justify-between gap-3">
                  <AppText size="12" :style="`color:var(--text-muted)`">Topics</AppText>
                  <AppText size="12" weight="semibold" class-list="text-right" :style="`color:var(--text-heading)`">{{ detail.learnerProfile.topicsOfInterest.join(', ') }}</AppText>
                </div>
              </div>
            </div>

          </div>
        </template>
      </UiSheetContent>
    </UiSheet>

    <!-- Students list -->
    <template v-if="loading">
      <div class="space-y-2">
        <UiSkeleton v-for="i in 4" :key="i" class="h-16 rounded-xl" />
      </div>
    </template>

    <div v-else-if="!students.length" class="text-center py-10">
      <AppIconsax name="People" color="var(--color-text-subtle)" :size="36" />
      <AppText size="14" class-list="block mt-2" :style="`color:var(--text-muted)`">No students enrolled yet</AppText>
    </div>

    <div v-else class="space-y-1">
      <div
        v-for="s in students" :key="s.userId"
        class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
        :onmouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'var(--surface-raised)'"
        :onmouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = ''"
        @click="openDetail(s.userId)"
      >
        <UiAvatar class="size-10 shrink-0">
          <UiAvatarImage v-if="s.avatarUrl" :src="s.avatarUrl" :alt="s.displayName" />
          <UiAvatarFallback class="text-[13px] font-semibold font-poppins" style="background:rgba(245,158,11,0.15);color:var(--color-brand-primary)">
            {{ avatarInitial(s.displayName || s.username) }}
          </UiAvatarFallback>
        </UiAvatar>

        <div class="flex-1 min-w-0">
          <AppText size="13" weight="medium" class-list="truncate block" :style="`color:var(--text-heading)`">{{ s.displayName || s.username }}</AppText>
          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
            <AppText v-if="s.currentLevel" size="11" :style="`color:var(--text-muted)`">{{ s.currentLevel }}</AppText>
            <span v-if="s.currentLevel && s.estimatedLevel" style="color:var(--text-subtle);font-size:10px">·</span>
            <AppText v-if="s.estimatedLevel" size="11" :style="`color:var(--text-muted)`">AI: {{ s.estimatedLevel }}</AppText>
          </div>
        </div>

        <div class="hidden sm:flex items-center gap-4 shrink-0">
          <div class="text-right">
            <AppText size="11" :uppercase="true" class-list="tracking-widest block" :style="`color:var(--text-subtle)`">Grammar</AppText>
            <AppText size="12" weight="semibold" :style="`color:var(--text-heading)`">{{ skillBar(s.grammarSkill) }}%</AppText>
          </div>
          <div class="text-right">
            <AppText size="11" :uppercase="true" class-list="tracking-widest block" :style="`color:var(--text-subtle)`">Vocab</AppText>
            <AppText size="12" weight="semibold" :style="`color:var(--text-heading)`">{{ skillBar(s.vocabularySkill) }}%</AppText>
          </div>
          <div class="text-right">
            <AppText size="11" :uppercase="true" class-list="tracking-widest block" :style="`color:var(--text-subtle)`">Streak</AppText>
            <AppText size="12" weight="semibold" :style="`color:var(--text-heading)`">{{ s.currentStreak }}d</AppText>
          </div>
        </div>

        <AppIconsax name="ArrowRight3" color="var(--color-text-subtle)" :size="14" class="shrink-0" />
      </div>
    </div>

    <!-- Assign vocabulary modal (for the open student) -->
    <PagesDashboardClassesAssignVocabularyModal
      v-if="detail"
      v-model:open="assignOpen"
      :student-name="detail.displayName || detail.username"
      :assigning="assigning"
      @submit="handleAssignWord"
    />

    <!-- Assign goal modal (reuses the shared goal form; we only need its create event) -->
    <PagesDashboardGoalsGoalFormModal
      v-if="detail"
      v-model:open="goalOpen"
      :submitting="assigningGoal"
      @create="handleAssignGoal"
    />

  </div>
</template>
