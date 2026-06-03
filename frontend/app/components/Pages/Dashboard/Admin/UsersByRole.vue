<script setup lang="ts">
import type { AdminDashboardData } from '~/common/types/admin-types'

defineProps<{ stats: AdminDashboardData }>()

const ROLES = [
  { key: 'STUDENT', label: 'Students', icon: 'People',  color: 'var(--color-brand-primary)' },
  { key: 'TUTOR',   label: 'Tutors',   icon: 'Teacher', color: '#38bdf8' },
  { key: 'ADMIN',   label: 'Admins',   icon: 'Shield',  color: '#a78bfa' },
] as const
</script>

<template>
  <div class="dash-card p-6">
    <p class="text-[18px] font-semibold font-poppins mb-5" :style="`color:var(--text-heading)`">Users by role</p>

    <div class="grid sm:grid-cols-3 gap-4">
      <div
        v-for="r in ROLES"
        :key="r.key"
        class="p-4 rounded-xl flex items-center gap-4"
        style="background:var(--surface-raised)"
      >
        <div class="size-10 rounded-xl flex items-center justify-center shrink-0" :style="`background:${r.color}18`">
          <AppIconsax :name="r.icon" :color="r.color" :size="18" />
        </div>
        <div>
          <p class="text-[14px] font-poppins" :style="`color:var(--text-muted)`">{{ r.label }}</p>
          <p class="text-[22px] font-semibold font-poppins tracking-tight" :style="`color:var(--text-heading)`">
            {{ stats.users.byRole[r.key].toLocaleString() }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
