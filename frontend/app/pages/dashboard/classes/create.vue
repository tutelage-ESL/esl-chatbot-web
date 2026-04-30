<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useAuthStore } from '~~/stores/auth'
import type { SvgBasedIconName } from '~/common/types/iconsax-types'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  const role = authStore.getUser?.role
  if (role !== 'TUTOR' && role !== 'ADMIN') router.replace('/dashboard/classes')
})

const { createClass } = useClasses()

// ─── Form state ────────────────────────────────────────────────────────────────
const className = ref('')
const classCategory = ref('')
const intervalSeconds = ref<number | null>(null)
const submitting = ref(false)
const classNameError = ref('')

const INTERVAL_OPTIONS: { label: string; description: string; value: number | null; icon: SvgBasedIconName }[] = [
  { label: 'Permanent', description: 'Code never expires', value: null, icon: 'Unlimited' },
  { label: 'Daily', description: 'Rotates every 24 hours', value: 86400, icon: 'Sun1' },
  { label: 'Weekly', description: 'Rotates every 7 days', value: 604800, icon: 'Calendar' },
  { label: 'Monthly', description: 'Rotates every 30 days', value: 2592000, icon: 'CalendarTick' },
  { label: 'Yearly', description: 'Rotates every 365 days', value: 31536000, icon: 'CalendarEdit' },
]

// ─── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  classNameError.value = ''
  if (!className.value.trim()) {
    classNameError.value = 'Class name is required.'
    return
  }

  submitting.value = true
  const res = await createClass({
    className: className.value.trim(),
    classCategory: classCategory.value.trim() || null,
    classCodeRefreshIntervalSeconds: intervalSeconds.value,
  })
  submitting.value = false

  if (!res.success) {
    toast.error(res.message || 'Could not create class')
    return
  }

  toast.success(`"${className.value.trim()}" created!`)
  router.push('/dashboard/classes')
}
</script>

<template>
  <div class="h-full overflow-y-auto p-5 sm:p-7">
    <div class="max-w-lg mx-auto space-y-6">

      <!-- Header -->
      <div class="flex items-center gap-3 animate-card-enter" style="--delay:0ms">
        <AppButton
          variant="secondary"
          size="36"
          radius="8"
          icon="ArrowLeft"
          :to="'/dashboard/classes'"
        />
        <div>
          <AppText size="22" weight="semibold" color="black" class-list="tracking-[-0.02em] block">Create a class</AppText>
          <AppText size="13" color="neutral-400" class-list="mt-0.5 block">Set up a new class for your students</AppText>
        </div>
      </div>

      <!-- Form card -->
      <div class="dash-card p-6 space-y-6 animate-card-enter" style="--delay:60ms">

        <!-- Class name -->
        <FormInput
          id="class-name"
          v-model="className"
          label="Class name"
          placeholder="e.g. Intermediate B2 — Morning Group"
          :error="classNameError"
          @update:model-value="classNameError = ''"
        />

        <!-- Category -->
        <FormInput
          id="class-category"
          v-model="classCategory"
          label="Category"
          placeholder="e.g. Grammar, Speaking, IELTS Prep… (optional)"
        />

        <!-- Divider -->
        <div class="h-px bg-black/5" />

        <!-- Refresh interval -->
        <div class="space-y-3">
          <div>
            <AppText size="13" weight="semibold" color="black" class-list="block">Code refresh interval</AppText>
            <AppText size="12" color="neutral-400" class-list="block mt-0.5">
              How often the class join code rotates automatically. Students need the latest code to join.
            </AppText>
          </div>
          <div class="grid grid-cols-1 gap-2">
            <button
              v-for="opt in INTERVAL_OPTIONS"
              :key="String(opt.value)"
              type="button"
              :class="[
                'flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                intervalSeconds === opt.value
                  ? 'border-brand-primary bg-brand-primary/5 shadow-sm'
                  : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50',
              ]"
              @click="intervalSeconds = opt.value"
            >
              <div
                :class="[
                  'size-9 rounded-xl flex items-center justify-center shrink-0',
                  intervalSeconds === opt.value ? 'bg-brand-primary/15' : 'bg-zinc-100',
                ]"
              >
                <AppIconsax
                  :name="opt.icon"
                  :color="intervalSeconds === opt.value ? 'var(--color-brand-primary)' : '#71717a'"
                  :size="16"
                />
              </div>
              <div class="flex-1">
                <AppText
                  size="13"
                  :color="intervalSeconds === opt.value ? 'brand-primary' : 'black'"
                  :weight="intervalSeconds === opt.value ? 'semibold' : 'medium'"
                  class-list="block"
                >
                  {{ opt.label }}
                </AppText>
                <AppText size="11" color="neutral-400" class-list="block">{{ opt.description }}</AppText>
              </div>
              <div
                :class="[
                  'size-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                  intervalSeconds === opt.value ? 'border-brand-primary' : 'border-zinc-300',
                ]"
              >
                <div v-if="intervalSeconds === opt.value" class="size-2 rounded-full bg-brand-primary" />
              </div>
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-2">
          <AppButton
            variant="secondary"
            size="40"
            radius="8"
            text="Cancel"
            class="flex-1"
            :to="'/dashboard/classes'"
          />
          <AppButton
            variant="primary"
            size="40"
            radius="8"
            icon="Add"
            :icon-config="{ color: 'white' }"
            text="Create class"
            class="flex-1"
            :loading="submitting"
            :disabled="!className.trim() || submitting"
            @click="handleSubmit"
          />
        </div>
      </div>

    </div>
  </div>
</template>
