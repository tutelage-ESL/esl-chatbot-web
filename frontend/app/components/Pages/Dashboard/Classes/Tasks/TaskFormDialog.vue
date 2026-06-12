<script setup lang="ts">
import { toast } from 'vue-sonner'
import { taskFormSchema, type TaskFormValues } from '~/common/schemas/TaskSchema'
import type { TaskItem } from '~/common/types/task-types'

const props = defineProps<{
  open: boolean
  classId: string
  task: TaskItem | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [task: TaskItem]
}>()

const { createTask, updateTask } = useTasks()

const isEdit = computed(() => !!props.task)
const submitting = ref(false)
const serverError = ref('')

const formData = ref<TaskFormValues>({
  title: '',
  description: '',
  deadline: '',
})

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function reset() {
  serverError.value = ''
  if (props.task) {
    formData.value = {
      title: props.task.title,
      description: props.task.description,
      deadline: props.task.deadline ? toDatetimeLocal(props.task.deadline) : '',
    }
  } else {
    formData.value = { title: '', description: '', deadline: '' }
  }
}

watch(() => props.open, open => { if (open) reset() })

async function handleSubmit() {
  if (submitting.value) return
  submitting.value = true
  serverError.value = ''

  const deadline = formData.value.deadline
    ? new Date(formData.value.deadline).toISOString()
    : null

  let res
  if (isEdit.value && props.task) {
    res = await updateTask(props.task.id, {
      title: formData.value.title,
      description: formData.value.description,
      deadline,
    })
  } else {
    res = await createTask(props.classId, {
      title: formData.value.title,
      description: formData.value.description,
      ...(deadline ? { deadline } : {}),
    })
  }

  submitting.value = false

  if (!res.success) {
    serverError.value = res.message || 'Something went wrong'
    return
  }

  const saved = (res.data as any)?.data as TaskItem
  emit('saved', saved)
  emit('update:open', false)
  toast.success(isEdit.value ? 'Task updated.' : 'Task created.')
}
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="p-0 gap-0 overflow-hidden sm:max-w-lg" :style="`background:var(--surface-card)`">
      <UiDialogHeader class="p-6 pb-4" style="border-bottom:1px solid var(--border-inner)">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-xl flex items-center justify-center" style="background:var(--surface-well)">
            <AppIconsax name="TaskSquare" color="var(--color-brand-primary)" :size="18" />
          </div>
          <div>
            <UiDialogTitle :style="`color:var(--text-heading)`">{{ isEdit ? 'Edit task' : 'New task' }}</UiDialogTitle>
            <UiDialogDescription :style="`color:var(--text-muted)`">{{ isEdit ? 'Update this task\'s details.' : 'Assign a new task to the class.' }}</UiDialogDescription>
          </div>
        </div>
      </UiDialogHeader>

      <Form :schema="taskFormSchema" :form-data="formData" class="p-6 space-y-4" @submit="handleSubmit">
        <template #default="{ errors }">
          <FormServerError :error="serverError" />

          <FormInput
            id="task-title"
            v-model="formData.title"
            label="Title"
            placeholder="e.g. Write a paragraph about your favourite place"
            :error="errors.title"
            required
          />

          <div class="space-y-1">
            <FormLabel for-id="task-description" label="Description" :required="true" />
            <UiTextarea
              id="task-description"
              v-model="formData.description"
              placeholder="Describe the task in detail…"
              rows="4"
              maxlength="5000"
              class="resize-none font-poppins text-[13px]"
              :style="`color:var(--text-body);background:var(--surface-raised);border-color:var(--border-inner)`"
            />
            <div class="flex items-center justify-between">
              <FormError :error="errors.description" />
              <AppText size="11" class-list="ml-auto" :style="`color:var(--text-subtle)`">{{ (formData.description || '').length }}/5000</AppText>
            </div>
          </div>

          <FormInput
            id="task-deadline"
            v-model="formData.deadline"
            label="Deadline"
            type="datetime-local"
            placeholder=""
            :error="errors.deadline"
          />

          <UiDialogFooter class="pt-2 flex gap-2">
            <UiDialogClose as-child>
              <AppButton variant="secondary" size="40" radius="8" text="Cancel" class="flex-1" />
            </UiDialogClose>
            <AppButton
              type="submit"
              variant="primary"
              size="40"
              radius="8"
              :icon="isEdit ? 'Edit2' : 'Add'"
              :icon-config="{ color: 'white', size: 15 }"
              :text="isEdit ? 'Save changes' : 'Create task'"
              class="flex-1"
              :loading="submitting"
            />
          </UiDialogFooter>
        </template>
      </Form>
    </UiDialogContent>
  </UiDialog>
</template>
