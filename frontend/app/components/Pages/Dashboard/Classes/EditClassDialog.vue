<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ClassItem } from '~/common/types/class-types'

const props = defineProps<{
  open: boolean
  cls: ClassItem | null
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  saved: []
}>()

const { updateClass, updateCodeSettings, toggleBlock } = useClasses()

const saving = ref(false)

const form = reactive({
  className: '',
  classCategory: '',
  classStatus: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  classCodeRefreshIntervalSeconds: null as number | null,
  classCodeBlocked: false,
})

const INTERVAL_OPTIONS: { label: string; desc: string; value: number | null }[] = [
  { label: 'Permanent',  desc: 'Code never auto-refreshes',        value: null     },
  { label: 'Daily',      desc: 'Refreshes every 24 hours',         value: 86400    },
  { label: 'Weekly',     desc: 'Refreshes every 7 days',           value: 604800   },
  { label: 'Monthly',    desc: 'Refreshes every 30 days',          value: 2592000  },
  { label: 'Yearly',     desc: 'Refreshes every 365 days',         value: 31536000 },
]

watch(() => props.open, (open) => {
  if (open && props.cls) {
    form.className = props.cls.className
    form.classCategory = props.cls.classCategory ?? ''
    form.classStatus = props.cls.classStatus
    form.classCodeRefreshIntervalSeconds = props.cls.classCodeRefreshIntervalSeconds
    form.classCodeBlocked = props.cls.classCodeBlocked
  }
})

async function save() {
  if (!props.cls || saving.value || !form.className.trim()) return
  saving.value = true

  const promises: Promise<any>[] = []

  // Class info changes
  const infoBody: Record<string, unknown> = {}
  if (form.className.trim() !== props.cls.className) infoBody.className = form.className.trim()
  if ((form.classCategory || null) !== props.cls.classCategory) infoBody.classCategory = form.classCategory || null
  if (form.classStatus !== props.cls.classStatus) infoBody.classStatus = form.classStatus
  if (Object.keys(infoBody).length) promises.push(updateClass(props.cls.id, infoBody))

  // Code settings changes (admin/tutor only)
  if (props.isAdmin || props.cls.myRole === 'TUTOR') {
    if (form.classCodeRefreshIntervalSeconds !== props.cls.classCodeRefreshIntervalSeconds)
      promises.push(updateCodeSettings(props.cls.id, form.classCodeRefreshIntervalSeconds))
    if (form.classCodeBlocked !== props.cls.classCodeBlocked)
      promises.push(toggleBlock(props.cls.id, form.classCodeBlocked))
  }

  if (!promises.length) {
    emit('update:open', false)
    saving.value = false
    return
  }

  const results = await Promise.all(promises)
  saving.value = false

  if (results.some(r => !r.success)) {
    toast.error('Some changes could not be saved.')
    return
  }

  toast.success('Class updated.')
  emit('update:open', false)
  emit('saved')
}
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="p-0 gap-0 overflow-hidden max-w-md" :style="`background:var(--surface-card)`">

      <!-- Header -->
      <UiDialogHeader class="p-6 pb-5" style="border-bottom:1px solid var(--border-inner)">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2)">
            <AppIconsax name="Edit2" color="var(--color-brand-primary)" :size="17" />
          </div>
          <div>
            <UiDialogTitle class="text-[16px] font-semibold leading-snug" :style="`color:var(--text-heading)`">Edit class</UiDialogTitle>
            <UiDialogDescription class="text-[12px] mt-0.5" :style="`color:var(--text-muted)`">{{ cls?.className }}</UiDialogDescription>
          </div>
        </div>
      </UiDialogHeader>

      <!-- Body -->
      <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

        <!-- Class name -->
        <FormInput
          id="edit-className"
          v-model="form.className"
          label="Class name"
          placeholder="e.g. English B1 Morning"
        />

        <!-- Category -->
        <FormInput
          id="edit-classCategory"
          v-model="form.classCategory"
          label="Category"
          placeholder="e.g. Grammar, Conversation…"
        />

        <!-- Status toggle -->
        <div>
          <AppText size="12" weight="semibold" class-list="block mb-2" :style="`color:var(--text-body)`">Status</AppText>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="s in (['ACTIVE', 'INACTIVE'] as const)" :key="s"
              type="button"
              class="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-semibold font-poppins transition-all cursor-pointer"
              :style="form.classStatus === s
                ? s === 'ACTIVE'
                  ? 'background:var(--status-active-bg);color:var(--status-active-text);border-color:var(--status-active-text)'
                  : 'background:var(--status-expired-bg);color:var(--status-expired-text);border-color:var(--status-expired-text)'
                : 'background:transparent;color:var(--text-muted);border-color:var(--border-inner)'"
              @click="form.classStatus = s"
            >
              <AppIconsax
                :name="s === 'ACTIVE' ? 'TickCircle' : 'MinusCirlce'"
                :size="14"
                :color="form.classStatus === s ? 'currentColor' : 'var(--color-text-subtle)'"
              />
              {{ s === 'ACTIVE' ? 'Active' : 'Inactive' }}
            </button>
          </div>
        </div>

        <!-- Code settings (tutor/admin) -->
        <template v-if="isAdmin || cls?.myRole === 'TUTOR'">
          <div style="height:1px;background:var(--border-inner)" />

          <!-- Refresh interval -->
          <div>
            <AppText size="12" weight="semibold" class-list="block mb-2" :style="`color:var(--text-body)`">Code refresh interval</AppText>
            <div class="space-y-1.5">
              <button
                v-for="opt in INTERVAL_OPTIONS" :key="String(opt.value)"
                type="button"
                class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer"
                :style="form.classCodeRefreshIntervalSeconds === opt.value
                  ? 'border-color:var(--color-brand-primary);background:rgba(245,158,11,0.05)'
                  : 'border-color:var(--border-card);background:var(--surface-raised)'"
                @click="form.classCodeRefreshIntervalSeconds = opt.value"
              >
                <div
                  class="size-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
                  :style="form.classCodeRefreshIntervalSeconds === opt.value
                    ? 'border-color:var(--color-brand-primary)'
                    : 'border-color:var(--text-subtle)'"
                >
                  <div
                    v-if="form.classCodeRefreshIntervalSeconds === opt.value"
                    class="size-2 rounded-full"
                    style="background:var(--color-brand-primary)"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <AppText
                    size="13"
                    :weight="form.classCodeRefreshIntervalSeconds === opt.value ? 'semibold' : 'normal'"
                    :style="form.classCodeRefreshIntervalSeconds === opt.value ? 'color:var(--color-brand-primary)' : 'color:var(--text-body)'"
                  >{{ opt.label }}</AppText>
                  <AppText size="11" class-list="block" :style="`color:var(--text-subtle)`">{{ opt.desc }}</AppText>
                </div>
              </button>
            </div>
          </div>

          <!-- Block toggle -->
          <div
            class="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors"
            style="background:var(--surface-raised);border:1px solid var(--border-inner)"
            @click="form.classCodeBlocked = !form.classCodeBlocked"
          >
            <div>
              <AppText size="13" weight="semibold" class-list="block" :style="`color:var(--text-heading)`">Block class code</AppText>
              <AppText size="12" :style="`color:var(--text-muted)`">Prevents new students from joining</AppText>
            </div>
            <div
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
              :style="form.classCodeBlocked ? 'background:#ef4444' : 'background:var(--surface-well)'"
            >
              <span
                class="inline-block size-4 rounded-full shadow transition-transform"
                style="background:white"
                :style="form.classCodeBlocked ? 'transform:translateX(1.375rem)' : 'transform:translateX(0.25rem)'"
              />
            </div>
          </div>
        </template>

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
          icon="TickCircle"
          :icon-config="{ color: 'white', size: 15 }"
          text="Save changes"
          class="flex-1"
          :loading="saving"
          :disabled="!form.className.trim()"
          @click="save"
        />
      </UiDialogFooter>

    </UiDialogContent>
  </UiDialog>
</template>
