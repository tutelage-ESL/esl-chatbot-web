<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useAuthStore } from '~~/stores/auth'
import type { ClassItem, ClassDetail } from '~/composables/useClasses'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const authStore = useAuthStore()
const { listMyClasses, getClass, joinClass, refreshCode } = useClasses()

const userRole = computed(() => authStore.getUser?.role)
const isTutorOrAdmin = computed(() => userRole.value === 'TUTOR' || userRole.value === 'ADMIN')

// ─── State ────────────────────────────────────────────────────────────────────
const classes = ref<ClassItem[]>([])
const loading = ref(true)
const joinModalOpen = ref(false)
const joining = ref(false)
const drawerOpen = ref(false)
const drawerClass = ref<ClassDetail | null>(null)
const drawerLoading = ref(false)
const copyingId = ref<string | null>(null)
const refreshingId = ref<string | null>(null)
const search = ref('')

// ─── Derived ──────────────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return classes.value
  return classes.value.filter(
    c => c.className.toLowerCase().includes(q) || (c.classCategory ?? '').toLowerCase().includes(q),
  )
})

const myClasses = computed(() => filtered.value.filter(c => c.myRole !== 'TUTOR' && c.myRole !== 'ADMIN'))
const managedClasses = computed(() => filtered.value.filter(c => c.myRole === 'TUTOR' || c.myRole === 'ADMIN'))

// ─── Load ──────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  const res = await listMyClasses()
  loading.value = false
  if (!res.success) { toast.error(res.message || 'Could not load classes'); return }
  classes.value = (res.data?.data ?? []) as ClassItem[]
}

onMounted(load)

// ─── Actions ───────────────────────────────────────────────────────────────────
async function handleJoin(code: string) {
  joining.value = true
  const res = await joinClass(code)
  joining.value = false
  if (!res.success) {
    if (res.status === 403) toast.error('This class code is blocked by the tutor.')
    else if (res.status === 404) toast.error('No class found with that code.')
    else if (res.status === 409) toast.error('You are already a member of this class.')
    else if (res.status === 410) toast.error('This code has expired — ask your tutor for the new one.')
    else toast.error(res.message || 'Could not join class')
    return
  }
  joinModalOpen.value = false
  toast.success(`Joined ${res.data?.data?.className ?? 'class'} successfully!`)
  await load()
}

async function openDrawer(id: string) {
  drawerOpen.value = true
  drawerClass.value = null
  drawerLoading.value = true
  const res = await getClass(id)
  drawerLoading.value = false
  if (!res.success) { toast.error(res.message || 'Could not load class details'); return }
  const raw = res.data?.data as any
  const myRole = classes.value.find(c => c.id === id)?.myRole
  drawerClass.value = { ...raw, myRole }
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
  await load()
  if (drawerClass.value?.id === id) await openDrawer(id)
}
</script>

<template>
  <div class="h-full overflow-y-auto p-5 sm:p-7 space-y-6">

    <!-- Page header -->
    <div class="flex items-center justify-between gap-4 animate-card-enter" style="--delay:0ms">
      <div>
        <AppText size="22" weight="semibold" color="black" class-list="tracking-[-0.02em] block">Classes</AppText>
        <AppText size="13" color="neutral-400" class-list="mt-0.5 block">Your enrolled and managed classes</AppText>
      </div>
      <div class="flex items-center gap-2">
        <AppButton
          v-if="isTutorOrAdmin"
          variant="secondary"
          size="38"
          radius="8"
          icon="Add"
          :icon-config="{ color: 'currentColor' }"
          text="New class"
          :to="'/dashboard/classes/create'"
        />
        <AppButton
          v-if="userRole === 'ADMIN'"
          variant="secondary"
          size="38"
          radius="8"
          icon="Category"
          :icon-config="{ color: 'currentColor' }"
          text="Manage all"
          :to="'/dashboard/classes/manage'"
        />
        <AppButton
          variant="primary"
          size="38"
          radius="8"
          icon="Login"
          :icon-config="{ color: 'white' }"
          text="Join a class"
          @click="joinModalOpen = true"
        />
      </div>
    </div>

    <!-- Search -->
    <div class="animate-card-enter max-w-sm" style="--delay:60ms">
      <FormInput
        id="classes-search"
        v-model="search"
        placeholder="Search classes…"
        icon="SearchNormal"
        :icon-config="{ color: '#a1a1aa', size: 14 }"
      />
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UiSkeleton v-for="i in 3" :key="i" class="h-44 rounded-2xl" :style="`opacity:${1 - i * 0.2}`" />
    </div>

    <!-- Empty — no classes at all -->
    <template v-else-if="classes.length === 0">
      <PagesDashboardClassesEmptyState
        class="animate-card-enter"
        style="--delay:80ms"
        @join="joinModalOpen = true"
      />
    </template>

    <template v-else>
      <!-- Managed classes (tutor / admin) -->
      <div v-if="managedClasses.length > 0" class="space-y-3 animate-card-enter" style="--delay:80ms">
        <AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.18em] block px-0.5">
          Managed ({{ managedClasses.length }})
        </AppText>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PagesDashboardClassesClassCard
            v-for="(cls, i) in managedClasses"
            :key="cls.id"
            :cls="cls"
            :copying="copyingId === cls.id"
            class="animate-card-enter"
            :style="`--delay:${100 + i * 50}ms`"
            @open="openDrawer"
            @copy="code => handleCopy(code, cls.id)"
            @refresh="handleRefresh"
          />
        </div>
      </div>

      <!-- Enrolled classes (student) -->
      <div v-if="myClasses.length > 0" class="space-y-3 animate-card-enter" :style="`--delay:${managedClasses.length > 0 ? 200 : 80}ms`">
        <AppText size="10" weight="semibold" color="neutral-400" :uppercase="true" class-list="tracking-[0.18em] block px-0.5">
          Enrolled ({{ myClasses.length }})
        </AppText>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PagesDashboardClassesClassCard
            v-for="(cls, i) in myClasses"
            :key="cls.id"
            :cls="cls"
            :copying="copyingId === cls.id"
            class="animate-card-enter"
            :style="`--delay:${(managedClasses.length > 0 ? 220 : 100) + i * 50}ms`"
            @open="openDrawer"
            @copy="code => handleCopy(code, cls.id)"
            @refresh="handleRefresh"
          />
        </div>
      </div>

      <!-- No results after search -->
      <PagesDashboardClassesEmptyState
        v-if="filtered.length === 0 && search"
        :message="`No classes match &quot;${search}&quot;`"
      />
    </template>

    <!-- Join modal -->
    <PagesDashboardClassesJoinClassModal
      v-model:open="joinModalOpen"
      :loading="joining"
      @join="handleJoin"
    />

    <!-- Detail drawer -->
    <PagesDashboardClassesClassDetailDrawer
      :open="drawerOpen"
      :cls="drawerClass"
      :copying="copyingId === drawerClass?.id"
      :refreshing="refreshingId === drawerClass?.id"
      @update:open="drawerOpen = $event"
      @copy="code => drawerClass && handleCopy(code, drawerClass.id)"
      @refresh="handleRefresh"
    />
  </div>
</template>
