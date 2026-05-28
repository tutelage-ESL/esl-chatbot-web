<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { AnnouncementItem } from '~/common/types/class-types'

const props = defineProps<{
  classId: string
  canPost: boolean
}>()

const { listAnnouncements, createAnnouncement } = useClasses()

const items = ref<AnnouncementItem[]>([])
const loading = ref(false)
const posting = ref(false)
const draft = ref('')
const page = ref(1)
const totalPages = ref(1)
const loadingMore = ref(false)

async function load(reset = false) {
  if (reset) { page.value = 1; items.value = [] }
  loading.value = reset
  loadingMore.value = !reset
  const res = await listAnnouncements(props.classId, { page: page.value, limit: 15 })
  loading.value = false
  loadingMore.value = false
  if (!res.success || !res.data) return
  const fetched = (res.data as any).data as AnnouncementItem[]
  const meta = (res.data as any).meta
  totalPages.value = meta?.totalPages ?? 1
  if (reset) items.value = fetched
  else items.value = [...items.value, ...fetched]
}

async function post() {
  const content = draft.value.trim()
  if (!content || posting.value) return
  posting.value = true
  const res = await createAnnouncement(props.classId, content)
  posting.value = false
  if (!res.success) { toast.error(res.message || 'Could not post announcement'); return }
  draft.value = ''
  const created = (res.data as any)?.data as AnnouncementItem
  if (created) items.value = [created, ...items.value]
}

async function loadMore() {
  if (page.value >= totalPages.value) return
  page.value++
  await load(false)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function avatarInitial(name: string) {
  return name.charAt(0).toUpperCase()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) post()
}

watch(() => props.classId, () => load(true), { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Compose box — tutor/admin only -->
    <div v-if="canPost" class="rounded-xl overflow-hidden" style="border:1px solid var(--border-card)">
      <div class="px-4 py-2.5 flex items-center gap-2" style="background:var(--surface-raised);border-bottom:1px solid var(--border-inner)">
        <AppIconsax name="Edit" color="var(--color-text-subtle)" :size="12" />
        <AppText size="11" weight="semibold" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">New announcement</AppText>
      </div>
      <div class="p-3" style="background:var(--surface-card)">
        <textarea
          v-model="draft"
          rows="3"
          maxlength="2000"
          placeholder="Write an announcement for your students… (Ctrl+Enter to post)"
          class="w-full resize-none outline-none bg-transparent text-[13px] placeholder:text-text-subtle font-poppins"
          :style="`color:var(--text-body)`"
          @keydown="onKeydown"
        />
        <div class="flex items-center justify-between mt-2">
          <AppText size="11" :style="`color:var(--text-subtle)`">{{ draft.length }}/2000</AppText>
          <AppButton
            variant="primary"
            size="32"
            radius="8"
            icon="Send"
            :icon-config="{ color: 'white', size: 13 }"
            text="Post"
            class="text-[12px]!"
            :loading="posting"
            :disabled="!draft.trim()"
            @click="post"
          />
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading">
      <div v-for="i in 3" :key="i" class="rounded-xl p-4 space-y-2" style="background:var(--surface-raised);border:1px solid var(--border-inner)">
        <div class="flex items-center gap-2">
          <UiSkeleton class="size-7 rounded-full" />
          <UiSkeleton class="h-3 w-28 rounded" />
          <UiSkeleton class="h-3 w-16 rounded ml-auto" />
        </div>
        <UiSkeleton class="h-3 w-full rounded" />
        <UiSkeleton class="h-3 w-4/5 rounded" />
      </div>
    </template>

    <!-- Empty state -->
    <div v-else-if="!items.length" class="text-center py-8">
      <AppIconsax name="Notification" color="var(--color-text-subtle)" :size="28" />
      <AppText size="13" class-list="block mt-2" :style="`color:var(--text-muted)`">No announcements yet</AppText>
      <AppText v-if="canPost" size="12" class-list="block mt-1" :style="`color:var(--text-subtle)`">Post one above to notify your students.</AppText>
    </div>

    <!-- Feed -->
    <template v-else>
      <div
        v-for="item in items"
        :key="item.id"
        class="rounded-xl p-4 space-y-2 animate-card-enter"
        style="background:var(--surface-raised);border:1px solid var(--border-inner)"
      >
        <div class="flex items-center gap-2">
          <UiAvatar class="size-7 shrink-0">
            <UiAvatarImage v-if="item.author.avatarUrl" :src="item.author.avatarUrl" :alt="item.author.displayName" />
            <UiAvatarFallback class="text-[11px] font-semibold font-poppins" style="background:rgba(245,158,11,0.15);color:var(--color-brand-primary)">
              {{ avatarInitial(item.author.displayName) }}
            </UiAvatarFallback>
          </UiAvatar>
          <AppText size="12" weight="semibold" class-list="truncate" :style="`color:var(--text-heading)`">{{ item.author.displayName }}</AppText>
          <AppText size="11" class-list="ml-auto shrink-0" :style="`color:var(--text-subtle)`">{{ fmtDate(item.createdAt) }} · {{ fmtTime(item.createdAt) }}</AppText>
        </div>
        <AppText size="13" class-list="whitespace-pre-wrap leading-relaxed" :style="`color:var(--text-body)`">{{ item.content }}</AppText>
      </div>

      <!-- Load more -->
      <div v-if="page < totalPages" class="flex justify-center pt-1">
        <AppButton
          variant="secondary"
          size="32"
          radius="8"
          text="Load older"
          :loading="loadingMore"
          class="text-[12px]!"
          @click="loadMore"
        />
      </div>
    </template>

  </div>
</template>
