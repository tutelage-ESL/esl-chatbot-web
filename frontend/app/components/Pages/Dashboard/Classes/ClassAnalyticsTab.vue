<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ClassAnalytics } from '~/common/types/class-types'

const props = defineProps<{ classId: string }>()

const { getClassAnalytics } = useClasses()
const analytics = ref<ClassAnalytics | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  const res = await getClassAnalytics(props.classId)
  loading.value = false
  if (!res.success) { toast.error(res.message || 'Could not load analytics'); return }
  analytics.value = ((res.data as any)?.data) as ClassAnalytics
}

function skillBar(val: number) { return Math.round(Math.min(100, Math.max(0, val ?? 0))) }

watch(() => props.classId, () => load(), { immediate: true })
</script>

<template>
  <div class="space-y-5">

    <template v-if="loading">
      <UiSkeleton class="h-32 rounded-xl" />
      <UiSkeleton class="h-48 rounded-xl" />
      <UiSkeleton class="h-32 rounded-xl" />
    </template>

    <template v-else-if="analytics">

      <!-- Average skills -->
      <div class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card)">
        <div class="px-4 py-2.5 flex items-center gap-2" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
          <AppIconsax name="Chart21" color="var(--color-text-subtle)" :size="12" />
          <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Class average skills</AppText>
          <AppText size="11" class-list="ml-auto" :style="`color:var(--text-subtle)`">{{ analytics.studentCount }} student{{ analytics.studentCount !== 1 ? 's' : '' }}</AppText>
        </div>
        <div class="p-4 space-y-3.5" style="background:var(--surface-card)">
          <div v-for="(val, label) in { Grammar: analytics.averageSkills.grammar, Vocabulary: analytics.averageSkills.vocabulary, Fluency: analytics.averageSkills.fluency }" :key="label">
            <div class="flex items-center justify-between mb-1.5">
              <AppText size="13" weight="medium" :style="`color:var(--text-body)`">{{ label }}</AppText>
              <AppText size="13" weight="semibold" :style="`color:var(--text-heading)`">{{ skillBar(val) }}%</AppText>
            </div>
            <div class="h-2 rounded-full overflow-hidden" style="background:var(--surface-raised)">
              <div
                class="h-full rounded-full transition-all"
                :style="`width:${skillBar(val)}%;background:${skillBar(val) >= 70 ? 'var(--color-brand-primary)' : skillBar(val) >= 40 ? '#f59e0b' : '#ef4444'}`"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Common grammar errors -->
      <div class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card)">
        <div class="px-4 py-2.5 flex items-center gap-2" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
          <AppIconsax name="Edit2" color="var(--color-text-subtle)" :size="12" />
          <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Common grammar errors</AppText>
          <AppText size="11" class-list="ml-auto" :style="`color:var(--text-subtle)`">last 30 days</AppText>
        </div>
        <div style="background:var(--surface-card)">
          <div v-if="!analytics.mostCommonGrammarErrors.length" class="p-5 text-center">
            <AppText size="13" :style="`color:var(--text-muted)`">No grammar data yet</AppText>
          </div>
          <div
            v-for="(item, i) in analytics.mostCommonGrammarErrors" :key="i"
            class="flex items-center gap-3 px-4 py-3"
            :style="i < analytics.mostCommonGrammarErrors.length - 1 ? 'border-bottom:1px solid var(--border-inner)' : ''"
          >
            <span class="size-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold font-poppins" style="background:var(--surface-raised);color:var(--text-muted)">{{ i + 1 }}</span>
            <AppText size="13" class-list="flex-1" :style="`color:var(--text-body)`">{{ item.error }}</AppText>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full font-poppins" style="background:var(--status-blocked-bg);color:var(--status-blocked-text)">
              {{ item.count }}×
            </span>
          </div>
        </div>
      </div>

      <!-- Vocab coverage -->
      <div class="rounded-xl p-4 flex items-center gap-4" style="background:var(--surface-raised);border:1px solid var(--border-inner)">
        <div class="size-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2)">
          <AppIconsax name="Book1" color="var(--color-brand-primary)" :size="16" />
        </div>
        <div>
          <AppText size="10" weight="semibold" :uppercase="true" class-list="tracking-[0.12em] block mb-0.5" :style="`color:var(--text-subtle)`">Avg vocabulary per student</AppText>
          <AppText size="20" weight="semibold" :style="`color:var(--text-heading)`">{{ Math.round(analytics.vocabularyCoverage) }} <span class="text-[13px] font-normal" style="color:var(--text-muted)">words</span></AppText>
        </div>
      </div>

    </template>
  </div>
</template>
