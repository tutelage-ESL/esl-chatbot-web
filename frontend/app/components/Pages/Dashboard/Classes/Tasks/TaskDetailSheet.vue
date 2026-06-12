<script setup lang="ts">
import { toast } from 'vue-sonner'
import { taskSubmissionSchema, type TaskSubmissionValues } from '~/common/schemas/TaskSchema'
import type { TaskItem, TaskSubmissionItem } from '~/common/types/task-types'

const props = defineProps<{
  task: TaskItem | null
  canManage: boolean
  isStudent: boolean
}>()

const emit = defineEmits<{
  close: []
  taskUpdated: [task: TaskItem]
}>()

const { listSubmissions, submitTask, getTask } = useTasks()

const isOpen = computed(() => !!props.task)
const submissions = ref<TaskSubmissionItem[]>([])
const loadingSubmissions = ref(false)
const submitting = ref(false)
const serverError = ref('')

const submitForm = ref<TaskSubmissionValues>({ content: '', fileUrl: '' })

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

// Reload submissions whenever a new task is opened (tutor/admin view only)
watch(() => props.task, async task => {
  submissions.value = []
  serverError.value = ''
  submitForm.value = { content: '', fileUrl: '' }
  if (!task || !props.canManage) return
  loadingSubmissions.value = true
  const res = await listSubmissions(task.id)
  loadingSubmissions.value = false
  if (!res.success) { toast.error(res.message || 'Could not load submissions'); return }
  submissions.value = ((res.data as any)?.data ?? []) as TaskSubmissionItem[]
})

async function handleSubmit() {
  if (!props.task || submitting.value) return
  submitting.value = true
  serverError.value = ''
  const body: { content?: string; fileUrl?: string } = {}
  if (submitForm.value.content?.trim()) body.content = submitForm.value.content.trim()
  if (submitForm.value.fileUrl?.trim()) body.fileUrl = submitForm.value.fileUrl.trim()
  const res = await submitTask(props.task.id, body)
  submitting.value = false
  if (!res.success) {
    // 409 = already submitted or closed — resync task state
    if (res.status === 409) {
      const refresh = await getTask(props.task.id)
      if (refresh.success && (refresh.data as any)?.data) {
        emit('taskUpdated', (refresh.data as any).data as TaskItem)
      }
    }
    serverError.value = res.message || 'Could not submit'
    return
  }
  const created = (res.data as any)?.data as TaskSubmissionItem
  const updated: TaskItem = { ...props.task, mySubmission: created }
  emit('taskUpdated', updated)
  toast.success('Submitted!')
}

function handleSubmissionUpdated(updated: TaskSubmissionItem) {
  submissions.value = submissions.value.map(s => s.id === updated.id ? updated : s)
}
</script>

<template>
  <UiSheet :open="isOpen" @update:open="val => { if (!val) emit('close') }">
    <UiSheetContent
      side="right"
      class="w-full sm:max-w-120 p-0 gap-0 flex flex-col"
      :style="`background:var(--surface-card);border-left:1px solid var(--border-card)`"
    >
      <template v-if="task">
        <!-- Header -->
        <UiSheetHeader class="p-5 pb-4 shrink-0" style="border-bottom:1px solid var(--border-inner)">
          <div class="pr-8 space-y-2">
            <div class="flex items-start gap-2 flex-wrap">
              <UiSheetTitle class="text-[16px] font-semibold leading-snug flex-1" :style="`color:var(--text-heading)`">
                {{ task.title }}
              </UiSheetTitle>
              <span
                class="text-[11px] font-semibold font-poppins px-2 py-0.5 rounded-lg shrink-0"
                :style="task.status === 'OPEN'
                  ? 'background:var(--status-active-bg);color:var(--status-active-text)'
                  : 'background:var(--status-inactive-bg);color:var(--status-inactive-text)'"
              >
                {{ task.status === 'OPEN' ? 'Open' : 'Closed' }}
              </span>
            </div>

            <!-- Meta row -->
            <div class="flex items-center gap-3 flex-wrap">
              <div class="flex items-center gap-1.5">
                <AppIconsax name="Profile" color="var(--color-text-subtle)" :size="11" />
                <AppText size="12" :style="`color:var(--text-muted)`">{{ task.createdBy.displayName }}</AppText>
              </div>
              <div class="flex items-center gap-1.5">
                <AppIconsax name="Calendar" color="var(--color-text-subtle)" :size="11" />
                <AppText size="12" :style="`color:var(--text-muted)`">{{ fmtDate(task.createdAt) }}</AppText>
              </div>
              <template v-if="task.deadline">
                <div class="flex items-center gap-1.5">
                  <AppIconsax name="Clock" color="var(--color-text-subtle)" :size="11" />
                  <AppText size="12" :style="`color:var(--text-muted)`">Due {{ fmtDate(task.deadline) }}</AppText>
                </div>
              </template>
            </div>
          </div>
        </UiSheetHeader>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto p-5 space-y-5">

          <!-- Description -->
          <div class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card)">
            <div class="px-4 py-2.5 flex items-center gap-2" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
              <AppIconsax name="DocumentText" color="var(--color-text-subtle)" :size="12" />
              <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Description</AppText>
            </div>
            <div class="p-4" style="background:var(--surface-card)">
              <AppText size="13" class-list="whitespace-pre-wrap leading-relaxed" :style="`color:var(--text-body)`">
                {{ task.description }}
              </AppText>
            </div>
          </div>

          <!-- ── TUTOR / ADMIN VIEW: submissions list ── -->
          <template v-if="canManage">
            <div class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card)">
              <div class="px-4 py-2.5 flex items-center justify-between" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
                <div class="flex items-center gap-2">
                  <AppIconsax name="DirectboxReceive" color="var(--color-text-subtle)" :size="12" />
                  <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Submissions</AppText>
                </div>
                <AppText v-if="!loadingSubmissions" size="11" :style="`color:var(--text-muted)`">{{ submissions.length }}</AppText>
              </div>

              <div class="p-4 space-y-3" style="background:var(--surface-card)">
                <template v-if="loadingSubmissions">
                  <UiSkeleton v-for="i in 3" :key="i" class="h-20 rounded-xl" />
                </template>
                <div v-else-if="!submissions.length" class="text-center py-6">
                  <AppIconsax name="DirectboxReceive" color="var(--color-text-subtle)" :size="24" />
                  <AppText size="13" class-list="block mt-2" :style="`color:var(--text-muted)`">No submissions yet</AppText>
                </div>
                <PagesDashboardClassesTasksSubmissionRow
                  v-for="s in submissions"
                  :key="s.id"
                  :task-id="task.id"
                  :submission="s"
                  @updated="handleSubmissionUpdated"
                />
              </div>
            </div>
          </template>

          <!-- ── STUDENT VIEW: submission form / status ── -->
          <template v-else-if="isStudent">

            <!-- Already submitted — show own submission + feedback -->
            <template v-if="task.mySubmission">
              <div class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card)">
                <div class="px-4 py-2.5 flex items-center gap-2" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
                  <AppIconsax name="TickCircle" color="var(--status-active-text)" :size="12" />
                  <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--status-active-text)`">Submitted</AppText>
                  <AppText size="11" class-list="ml-auto" :style="`color:var(--text-subtle)`">{{ fmtDate(task.mySubmission.createdAt) }}</AppText>
                </div>
                <div class="p-4 space-y-3" style="background:var(--surface-card)">
                  <AppText v-if="task.mySubmission.content" size="13" class-list="whitespace-pre-wrap leading-relaxed" :style="`color:var(--text-body)`">
                    {{ task.mySubmission.content }}
                  </AppText>
                  <div v-if="task.mySubmission.fileUrl" class="flex items-center gap-2">
                    <AppIconsax name="AttachCircle" color="var(--color-brand-primary)" :size="14" />
                    <AppLink :to="task.mySubmission.fileUrl" target="_blank" rel="noopener noreferrer" class="text-[13px] text-brand-primary underline underline-offset-2 truncate">
                      {{ task.mySubmission.fileUrl }}
                    </AppLink>
                  </div>
                </div>
              </div>

              <!-- Feedback received -->
              <div v-if="task.mySubmission.feedback" class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card);border-left:3px solid var(--color-brand-primary)">
                <div class="px-4 py-2.5 flex items-center gap-2" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
                  <AppIconsax name="MessageText" color="var(--color-brand-primary)" :size="12" />
                  <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--color-brand-primary)`">Feedback</AppText>
                  <AppText v-if="task.mySubmission.feedbackAt" size="11" class-list="ml-auto" :style="`color:var(--text-subtle)`">{{ fmtDate(task.mySubmission.feedbackAt) }}</AppText>
                </div>
                <div class="p-4" style="background:var(--surface-card)">
                  <AppText size="13" class-list="whitespace-pre-wrap leading-relaxed" :style="`color:var(--text-body)`">
                    {{ task.mySubmission.feedback }}
                  </AppText>
                </div>
              </div>
              <div v-else class="rounded-lg p-3 text-center" style="background:var(--surface-raised);border:1px solid var(--border-inner)">
                <AppText size="13" :style="`color:var(--text-muted)`">Your submission is under review.</AppText>
              </div>
            </template>

            <!-- Task closed, no submission -->
            <template v-else-if="task.status === 'CLOSED'">
              <div class="rounded-lg p-4 text-center" style="background:var(--surface-raised);border:1px solid var(--border-inner)">
                <AppIconsax name="Lock1" color="var(--color-text-subtle)" :size="20" />
                <AppText size="13" class-list="block mt-2" :style="`color:var(--text-muted)`">This task is closed — submissions are no longer accepted.</AppText>
              </div>
            </template>

            <!-- Submission form (task open, not yet submitted) -->
            <template v-else>
              <div class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card)">
                <div class="px-4 py-2.5 flex items-center gap-2" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
                  <AppIconsax name="Edit" color="var(--color-text-subtle)" :size="12" />
                  <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Submit your work</AppText>
                </div>
                <Form
                  :schema="taskSubmissionSchema"
                  :form-data="submitForm"
                  class="p-4 space-y-3"
                  @submit="handleSubmit"
                >
                  <template #default="{ errors }">
                    <FormServerError :error="serverError" />
                    <div class="space-y-1">
                      <FormLabel for-id="submit-content" label="Written work" />
                      <UiTextarea
                        id="submit-content"
                        v-model="submitForm.content"
                        placeholder="Write your answer here…"
                        rows="5"
                        maxlength="10000"
                        class="resize-none font-poppins text-[13px] w-full"
                        :style="`color:var(--text-body);background:var(--surface-raised);border-color:var(--border-inner)`"
                      />
                      <div class="flex items-center justify-between">
                        <FormError :error="errors.content" />
                        <AppText size="11" class-list="ml-auto" :style="`color:var(--text-subtle)`">{{ (submitForm.content || '').length }}/10000</AppText>
                      </div>
                    </div>
                    <FormInput
                      id="submit-fileurl"
                      v-model="submitForm.fileUrl"
                      label="Or attach a link"
                      placeholder="https://docs.google.com/…"
                      :error="errors.fileUrl"
                    />
                    <div class="flex justify-end">
                      <AppButton
                        type="submit"
                        variant="primary"
                        size="36"
                        radius="8"
                        icon="Send2"
                        :icon-config="{ color: 'white', size: 14 }"
                        text="Submit"
                        :loading="submitting"
                      />
                    </div>
                  </template>
                </Form>
              </div>
            </template>
          </template>

        </div>
      </template>
    </UiSheetContent>
  </UiSheet>
</template>
