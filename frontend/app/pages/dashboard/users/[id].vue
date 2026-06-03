<script setup lang="ts">
import { useAdmin } from '~/composables/useAdmin'
import type { AdminUserItem } from '~/common/types/admin-types'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const route = useRoute()
const router = useRouter()
const { getUser, patchUser } = useAdmin()

const userId = computed(() => route.params.id as string)
const user = ref<AdminUserItem | null>(null)
const loading = ref(false)
const toggling = ref(false)

async function load() {
  loading.value = true
  const res = await getUser(userId.value)
  if (res.success && res.data?.data) user.value = res.data.data
  loading.value = false
}

onMounted(load)

async function onToggleActive(checked: boolean) {
  if (!user.value) return
  toggling.value = true
  const res = await patchUser(user.value.id, { isActive: checked })
  if (res.success && res.data?.data) user.value = res.data.data
  toggling.value = false
}

const PLAN_COLOR: Record<string, string> = {
  FREE:    'bg-surface-raised text-text-muted',
  GOLD:    'bg-amber-500/15 text-amber-500',
  PREMIUM: 'bg-violet-500/15 text-violet-500',
}
</script>

<template>
  <div class="h-full overflow-y-auto p-5 sm:p-7">

    <!-- Back -->
    <div class="mb-6">
      <AppButton variant="secondary" size="36" radius="8" icon="ArrowLeft" text="Back to users" @click="router.push('/dashboard/users')" />
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="max-w-2xl space-y-4">
      <UiSkeleton class="h-28 rounded-2xl" />
      <UiSkeleton class="h-56 rounded-2xl" />
      <UiSkeleton class="h-36 rounded-2xl" />
    </div>

    <template v-else-if="user">
      <div class="max-w-2xl space-y-5">

        <!-- User header card -->
        <div class="dash-card p-6 flex items-center gap-5 flex-wrap animate-card-enter" style="--delay:0ms">
          <UiAvatar class="w-16 h-16 rounded-2xl shrink-0">
            <UiAvatarImage v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.displayName" class="object-cover" />
            <UiAvatarFallback
              class="w-full h-full rounded-2xl text-[22px] font-semibold font-poppins text-white"
              style="background:linear-gradient(135deg,var(--color-brand-primary),#b45309)"
            >
              {{ (user.displayName || user.username).charAt(0).toUpperCase() }}
            </UiAvatarFallback>
          </UiAvatar>

          <div class="flex-1 min-w-0">
            <p class="text-[20px] font-semibold tracking-tight font-poppins" :style="`color:var(--text-heading)`">
              {{ user.displayName || user.username }}
            </p>
            <p class="text-[14px] font-poppins mt-0.5" :style="`color:var(--text-muted)`">{{ user.email }}</p>
            <div class="mt-2 flex items-center gap-2 flex-wrap">
              <span :class="['text-[14px] font-semibold px-2.5 py-0.5 rounded-md font-poppins', PLAN_COLOR[user.subscription?.plan ?? 'FREE']]">
                {{ user.subscription?.plan ?? 'FREE' }}
              </span>
              <span class="text-[14px] font-semibold px-2.5 py-0.5 rounded-md font-poppins"
                :style="user.isActive
                  ? 'background:var(--status-active-bg);color:var(--status-active-text)'
                  : 'background:var(--status-expired-bg);color:var(--status-expired-text)'"
              >
                {{ user.isActive ? 'Active' : 'Banned' }}
              </span>
              <span class="text-[14px] font-poppins" :style="`color:var(--text-subtle)`">
                {{ user.role.charAt(0) + user.role.slice(1).toLowerCase() }}
              </span>
            </div>
          </div>

          <p class="text-[14px] font-mono shrink-0" :style="`color:var(--text-subtle)`">
            Joined {{ new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) }}
          </p>
        </div>

        <!-- Account status toggle card -->
        <div class="dash-card p-6 animate-card-enter" style="--delay:80ms">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-[16px] font-semibold font-poppins" :style="`color:var(--text-heading)`">Account status</p>
              <p class="text-[14px] font-poppins mt-0.5" :style="`color:var(--text-muted)`">
                {{ user.isActive
                  ? 'Account is active — user can log in and use the platform.'
                  : 'Account is banned — user cannot log in or access the platform.' }}
              </p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-[14px] font-medium font-poppins"
                :style="user.isActive ? 'color:var(--status-active-text)' : 'color:var(--status-expired-text)'"
              >
                {{ user.isActive ? 'Active' : 'Banned' }}
              </span>
              <UiSwitch
                :model-value="user.isActive"
                :disabled="toggling"
                @update:model-value="onToggleActive"
              />
            </div>
          </div>
        </div>

        <!-- Profile info (read-only) -->
        <div class="dash-card p-6 space-y-4 animate-card-enter" style="--delay:160ms">
          <p class="text-[18px] font-semibold font-poppins" :style="`color:var(--text-heading)`">Profile info</p>
          <div class="grid sm:grid-cols-2 gap-3">
            <div class="p-4 rounded-xl" style="background:var(--surface-raised)">
              <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">Username</p>
              <p class="text-[15px] font-semibold font-poppins mt-0.5" :style="`color:var(--text-heading)`">{{ user.username }}</p>
            </div>
            <div class="p-4 rounded-xl" style="background:var(--surface-raised)">
              <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">Display name</p>
              <p class="text-[15px] font-semibold font-poppins mt-0.5" :style="`color:var(--text-heading)`">{{ user.displayName || '—' }}</p>
            </div>
            <div class="p-4 rounded-xl" style="background:var(--surface-raised)">
              <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">Email</p>
              <p class="text-[15px] font-semibold font-poppins mt-0.5 truncate" :style="`color:var(--text-heading)`">{{ user.email }}</p>
            </div>
            <div class="p-4 rounded-xl" style="background:var(--surface-raised)">
              <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">Phone</p>
              <p class="text-[15px] font-semibold font-poppins mt-0.5" :style="`color:var(--text-heading)`">{{ user.phoneNumber || '—' }}</p>
            </div>
            <div class="p-4 rounded-xl" style="background:var(--surface-raised)">
              <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">Role</p>
              <p class="text-[15px] font-semibold font-poppins mt-0.5" :style="`color:var(--text-heading)`">
                {{ user.role.charAt(0) + user.role.slice(1).toLowerCase() }}
              </p>
            </div>
            <div class="p-4 rounded-xl" style="background:var(--surface-raised)">
              <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">User ID</p>
              <p class="text-[14px] font-mono mt-0.5 truncate" :style="`color:var(--text-subtle)`">{{ user.id }}</p>
            </div>
          </div>
        </div>

        <!-- Subscription card -->
        <div class="dash-card p-6 space-y-4 animate-card-enter" style="--delay:240ms">
          <p class="text-[18px] font-semibold font-poppins" :style="`color:var(--text-heading)`">Subscription</p>
          <div class="grid sm:grid-cols-3 gap-3">
            <div class="p-4 rounded-xl" style="background:var(--surface-raised)">
              <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">Plan</p>
              <p class="text-[16px] font-semibold font-poppins mt-0.5" :style="`color:var(--text-heading)`">{{ user.subscription?.plan ?? 'FREE' }}</p>
            </div>
            <div class="p-4 rounded-xl" style="background:var(--surface-raised)">
              <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">Status</p>
              <p class="text-[16px] font-semibold font-poppins mt-0.5" :style="`color:var(--text-heading)`">
                {{ user.subscription?.status ?? '—' }}
              </p>
            </div>
            <div class="p-4 rounded-xl" style="background:var(--surface-raised)">
              <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">Expires</p>
              <p class="text-[16px] font-semibold font-poppins mt-0.5" :style="`color:var(--text-heading)`">
                {{ user.subscription?.currentPeriodEnd
                  ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—' }}
              </p>
            </div>
          </div>
        </div>

      </div>
    </template>

  </div>
</template>
