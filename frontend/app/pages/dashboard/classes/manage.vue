<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useAuthStore } from '~~/stores/auth'
import type { AdminClassItem, ClassDetail, ClassPaginationMeta } from '~/common/types/class-types'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (authStore.getUser?.role !== 'ADMIN') router.replace('/dashboard/classes')
})

const { listAllClasses, getClass, refreshCode } = useClasses()

// ─── State ────────────────────────────────────────────────────────────────────
const classes = ref<AdminClassItem[]>([])
const meta = ref<ClassPaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 })
const loading = ref(true)
const search = ref('')
const statusFilter = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
const view = ref<'grid' | 'table'>('grid')

// Drawer
const drawerOpen = ref(false)
const drawerClass = ref<ClassDetail | null>(null)
const copyingId = ref<string | null>(null)
const refreshingId = ref<string | null>(null)

// Delete confirm dialog
const deleteDialogOpen = ref(false)
const deletingId = ref<string | null>(null)
const deletingName = ref('')
const deleteLoading = ref(false)

// Edit dialog
const editDialogOpen = ref(false)
const editingClass = ref<AdminClassItem | null>(null)

// ─── Derived ──────────────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return classes.value
  return classes.value.filter(
    c => c.className.toLowerCase().includes(q) ||
      c.classCode.toLowerCase().includes(q) ||
      (c.classCategory ?? '').toLowerCase().includes(q),
  )
})
const activeCount = computed(() => classes.value.filter(c => c.classStatus === 'ACTIVE').length)
const inactiveCount = computed(() => classes.value.filter(c => c.classStatus === 'INACTIVE').length)

// ─── Load ──────────────────────────────────────────────────────────────────────
async function load(page = 1) {
  loading.value = true
  const res = await listAllClasses({
    page,
    limit: meta.value.limit,
    status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
  })
  loading.value = false
  if (!res.success) { toast.error(res.message || 'Could not load classes'); return }
  classes.value = (res.data?.data ?? []) as AdminClassItem[]
  if (res.data?.meta) meta.value = res.data.meta as PaginationMeta
}
onMounted(load)
watch(statusFilter, () => load(1))

// ─── Drawer ───────────────────────────────────────────────────────────────────
async function openDrawer(id: string) {
  drawerOpen.value = true
  drawerClass.value = null
  const res = await getClass(id)
  if (!res.success) { toast.error(res.message || 'Could not load class'); return }
  drawerClass.value = res.data?.data as ClassDetail
}

async function handleCopy(code: string, id: string) {
  copyingId.value = id
  useCopyToClipboard(code)
  toast.success('Class code copied!')
  setTimeout(() => { copyingId.value = null }, 1500)
}

async function handleRefresh(id: string) {
  if (refreshingId.value) return
  refreshingId.value = id
  const res = await refreshCode(id)
  refreshingId.value = null
  if (!res.success) { toast.error(res.message || 'Could not rotate code'); return }
  toast.success('Class code rotated!')
  await load(meta.value.page)
  if (drawerClass.value?.id === id) await openDrawer(id)
}

// ─── Edit ─────────────────────────────────────────────────────────────────────
function openEdit(id: string) {
  const cls = classes.value.find(c => c.id === id)
  if (!cls) return
  editingClass.value = cls
  editDialogOpen.value = true
}

async function handleEditSaved() {
  editDialogOpen.value = false
  await load(meta.value.page)
  if (drawerClass.value?.id === editingClass.value?.id) await openDrawer(editingClass.value!.id)
}

// ─── Delete ───────────────────────────────────────────────────────────────────
function openDelete(id: string) {
  const cls = classes.value.find(c => c.id === id)
  if (!cls) return
  deletingId.value = id
  deletingName.value = cls.className
  deleteDialogOpen.value = true
}

async function handleConfirmDelete() {
  // No DELETE endpoint exists yet — show informative message
  deleteDialogOpen.value = false
  toast.error('Delete class is not yet available in the API.')
}
</script>

<template>
  <div class="h-full overflow-y-auto p-5 sm:p-7 space-y-6" :style="`background:var(--surface-page)`">

    <!-- Header -->
    <div class="flex items-center justify-between gap-4 animate-card-enter" style="--delay:0ms">
      <div class="flex items-center gap-3">
        <AppButton
          variant="secondary"
          size="36"
          radius="8"
          icon="ArrowLeft"
          :icon-config="{ color: 'currentColor', size: 15 }"
          :to="'/dashboard/classes'"
        />
        <div>
          <AppText size="22" weight="semibold" color="black" class-list="tracking-[-0.02em] block" :style="`color:var(--text-heading)`">All Classes</AppText>
          <AppText size="13" color="neutral-400" class-list="mt-0.5 block" :style="`color:var(--text-muted)`">Admin overview · {{ meta.total }} total</AppText>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <AppButton
          :variant="view === 'grid' ? 'primary' : 'secondary'"
          size="36"
          radius="8"
          icon="Category"
          :icon-config="{ color: view === 'grid' ? 'white' : 'currentColor', size: 14 }"
          text="Grid"
          @click="view = 'grid'"
        />
        <AppButton
          :variant="view === 'table' ? 'primary' : 'secondary'"
          size="36"
          radius="8"
          icon="TableDocument"
          :icon-config="{ color: view === 'table' ? 'white' : 'currentColor', size: 14 }"
          text="Table"
          @click="view = 'table'"
        />
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-3 gap-3 animate-card-enter" style="--delay:30ms">
      <div class="dash-card p-4 flex items-center gap-3">
        <div class="size-9 rounded-xl flex items-center justify-center shrink-0" style="background:var(--surface-well)">
          <AppIconsax name="Buildings2" color="var(--color-text-muted)" :size="16" />
        </div>
        <div>
          <AppText size="11" color="neutral-400" class-list="block" :style="`color:var(--text-muted)`">Total</AppText>
          <AppText size="18" weight="semibold" color="black" :style="`color:var(--text-heading)`">{{ meta.total }}</AppText>
        </div>
      </div>
      <div class="dash-card p-4 flex items-center gap-3">
        <div class="size-9 rounded-xl flex items-center justify-center shrink-0" style="background:var(--status-active-bg)">
          <AppIconsax name="TickCircle" color="var(--status-active-text)" :size="16" />
        </div>
        <div>
          <AppText size="11" color="neutral-400" class-list="block" :style="`color:var(--text-muted)`">Active</AppText>
          <AppText size="18" weight="semibold" color="black" :style="`color:var(--text-heading)`">{{ activeCount }}</AppText>
        </div>
      </div>
      <div class="dash-card p-4 flex items-center gap-3">
        <div class="size-9 rounded-xl flex items-center justify-center shrink-0" style="background:var(--surface-well)">
          <AppIconsax name="MinusCirlce" color="var(--color-text-muted)" :size="16" />
        </div>
        <div>
          <AppText size="11" color="neutral-400" class-list="block" :style="`color:var(--text-muted)`">Inactive</AppText>
          <AppText size="18" weight="semibold" color="black" :style="`color:var(--text-heading)`">{{ inactiveCount }}</AppText>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 animate-card-enter" style="--delay:50ms">
      <div class="flex-1 min-w-48 max-w-sm">
        <FormInput
          id="admin-search"
          v-model="search"
          placeholder="Search by name, code, or category…"
          icon="SearchNormal"
          :icon-config="{ color: 'var(--color-text-subtle)', size: 14 }"
        />
      </div>
      <div class="flex items-center gap-1.5">
        <AppButton :variant="statusFilter === 'ALL' ? 'primary' : 'secondary'" size="36" radius="8" text="All" :icon-config="{ color: statusFilter === 'ALL' ? 'white' : 'currentColor' }" @click="statusFilter = 'ALL'" />
        <AppButton :variant="statusFilter === 'ACTIVE' ? 'primary' : 'secondary'" size="36" radius="8" text="Active" :icon-config="{ color: statusFilter === 'ACTIVE' ? 'white' : 'currentColor' }" @click="statusFilter = 'ACTIVE'" />
        <AppButton :variant="statusFilter === 'INACTIVE' ? 'primary' : 'secondary'" size="36" radius="8" text="Inactive" :icon-config="{ color: statusFilter === 'INACTIVE' ? 'white' : 'currentColor' }" @click="statusFilter = 'INACTIVE'" />
      </div>
    </div>

    <!-- Loading -->
    <template v-if="loading">
      <div v-if="view === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UiSkeleton v-for="i in 6" :key="i" class="h-52 rounded-2xl" :style="`opacity:${1 - i * 0.1}`" />
      </div>
      <div v-else class="dash-card overflow-hidden">
        <UiSkeleton v-for="i in 8" :key="i" class="h-14 rounded-none last:border-0" style="border-bottom:1px solid var(--border-inner)" />
      </div>
    </template>

    <!-- Empty -->
    <template v-else-if="filtered.length === 0">
      <UiEmpty class="rounded-2xl py-16 animate-card-enter" style="--delay:80ms;border:1px dashed var(--border-card)">
        <UiEmptyMedia>
          <div class="size-14 rounded-2xl flex items-center justify-center" style="background:var(--surface-well)">
            <AppIconsax name="Buildings2" color="var(--color-text-subtle)" :size="26" />
          </div>
        </UiEmptyMedia>
        <UiEmptyContent>
          <UiEmptyTitle>No classes found</UiEmptyTitle>
          <UiEmptyDescription>
            {{ search ? `No classes match "${search}"` : 'No classes in this filter yet.' }}
          </UiEmptyDescription>
        </UiEmptyContent>
      </UiEmpty>
    </template>

    <!-- Grid -->
    <template v-else-if="view === 'grid'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-card-enter" style="--delay:80ms">
        <PagesDashboardClassesAdminClassGridCard
          v-for="(cls, i) in filtered"
          :key="cls.id"
          :cls="cls"
          class="animate-card-enter"
          :style="`--delay:${100 + i * 40}ms`"
          @open="openDrawer"
          @edit="openEdit"
          @delete="openDelete"
        />
      </div>
    </template>

    <!-- Table -->
    <template v-else>
      <div class="dash-card overflow-hidden animate-card-enter" style="--delay:80ms">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr style="border-bottom:1px solid var(--border-inner);background:var(--surface-raised)">
                <th class="px-4 py-3"><AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Class</AppText></th>
                <th class="px-4 py-3"><AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Code</AppText></th>
                <th class="px-4 py-3"><AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Status</AppText></th>
                <th class="px-4 py-3"><AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Members</AppText></th>
                <th class="px-4 py-3"><AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Refresh</AppText></th>
                <th class="px-4 py-3"><AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Created</AppText></th>
                <th class="px-4 py-3"><AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.12em]" :style="`color:var(--text-subtle)`">Actions</AppText></th>
              </tr>
            </thead>
            <tbody>
              <PagesDashboardClassesAdminClassTableRow
                v-for="cls in filtered"
                :key="cls.id"
                :cls="cls"
                @open="openDrawer"
                @edit="openEdit"
                @delete="openDelete"
              />
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Pagination -->
    <div v-if="!loading && meta.totalPages > 1" class="flex items-center justify-between gap-4 animate-card-enter" style="--delay:120ms">
      <AppText size="13" color="neutral-400" :style="`color:var(--text-muted)`">
        Page {{ meta.page }} of {{ meta.totalPages }} ({{ meta.total }} total)
      </AppText>
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" size="32" radius="8" icon="ArrowLeft2" :disabled="meta.page <= 1" @click="load(meta.page - 1)" />
        <AppButton variant="secondary" size="32" radius="8" icon="ArrowRight2" :disabled="meta.page >= meta.totalPages" @click="load(meta.page + 1)" />
      </div>
    </div>

    <!-- Detail drawer -->
    <PagesDashboardClassesClassDetailDrawer
      :open="drawerOpen"
      :cls="drawerClass"
      :copying="copyingId === drawerClass?.id"
      :refreshing="refreshingId === drawerClass?.id"
      :is-admin="true"
      @update:open="drawerOpen = $event"
      @copy="code => drawerClass && handleCopy(code, drawerClass.id)"
      @refresh="handleRefresh"
      @edit="openEdit"
      @delete="openDelete"
    />

    <!-- Edit dialog (shared component) -->
    <PagesDashboardClassesEditClassDialog
      :open="editDialogOpen"
      :cls="editingClass"
      :is-admin="true"
      @update:open="editDialogOpen = $event"
      @saved="handleEditSaved"
    />

    <!-- Delete confirm dialog -->
    <UiDialog v-model:open="deleteDialogOpen">
      <UiDialogContent class="p-0 gap-0 overflow-hidden" :style="`background:var(--surface-card)`">
        <UiDialogHeader class="p-6 pb-4">
          <div class="flex items-start gap-4">
            <div class="size-11 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(239,68,68,0.1)">
              <AppIconsax name="Trash" color="#ef4444" :size="20" />
            </div>
            <div>
              <UiDialogTitle :style="`color:var(--text-heading)`">Delete class?</UiDialogTitle>
              <UiDialogDescription class="mt-1" :style="`color:var(--text-muted)`">
                <strong :style="`color:var(--text-body)`">{{ deletingName }}</strong> and all its members, sessions, and data will be permanently removed. This cannot be undone.
              </UiDialogDescription>
            </div>
          </div>
        </UiDialogHeader>
        <UiDialogFooter class="p-6 pt-0 flex gap-2">
          <UiDialogClose as-child>
            <AppButton variant="secondary" size="40" radius="8" text="Cancel" class="flex-1" />
          </UiDialogClose>
          <AppButton
            variant="primary"
            size="40"
            radius="8"
            icon="Trash"
            :icon-config="{ color: 'white', size: 15 }"
            text="Delete class"
            class="flex-1"
            :loading="deleteLoading"
            style="background:#ef4444;border-color:#ef4444"
            @click="handleConfirmDelete"
          />
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>

  </div>
</template>
