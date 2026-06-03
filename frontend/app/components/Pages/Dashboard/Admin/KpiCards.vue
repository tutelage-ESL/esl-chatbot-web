<script setup lang="ts">
import type { AdminDashboardData } from '~/common/types/admin-types'

defineProps<{ stats: AdminDashboardData }>()
</script>

<template>
  <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

    <!-- Total users -->
    <div class="dash-card p-5">
      <div class="flex items-start justify-between">
        <p class="text-[14px] uppercase tracking-[0.16em] font-semibold font-poppins" :style="`color:var(--text-subtle)`">Total users</p>
        <div class="size-8 rounded-lg flex items-center justify-center" style="background:var(--surface-raised)">
          <AppIconsax name="People" color="var(--color-text-muted)" :size="16" />
        </div>
      </div>
      <p class="mt-2 text-[28px] font-semibold tracking-tight font-poppins" :style="`color:var(--text-heading)`">
        {{ stats.users.total.toLocaleString() }}
      </p>
      <p class="mt-1 text-[14px] font-poppins" :style="`color:var(--text-muted)`">
        {{ stats.users.byRole.STUDENT }} students · {{ stats.users.byRole.TUTOR }} tutors
      </p>
    </div>

    <!-- Sessions today -->
    <div class="dash-card p-5">
      <div class="flex items-start justify-between">
        <p class="text-[14px] uppercase tracking-[0.16em] font-semibold font-poppins" :style="`color:var(--text-subtle)`">Sessions today</p>
        <div class="size-8 rounded-lg flex items-center justify-center" style="background:var(--surface-raised)">
          <AppIconsax name="Messages" color="var(--color-text-muted)" :size="16" />
        </div>
      </div>
      <p class="mt-2 text-[28px] font-semibold tracking-tight font-poppins" :style="`color:var(--text-heading)`">
        {{ stats.totalSessionsToday.toLocaleString() }}
      </p>
      <p class="mt-1 text-[14px] font-poppins" :style="`color:var(--text-muted)`">Started today</p>
    </div>

    <!-- Daily active users -->
    <div class="dash-card p-5">
      <div class="flex items-start justify-between">
        <p class="text-[14px] uppercase tracking-[0.16em] font-semibold font-poppins" :style="`color:var(--text-subtle)`">Daily active</p>
        <div class="size-8 rounded-lg flex items-center justify-center" style="background:var(--surface-raised)">
          <AppIconsax name="Flash" color="var(--color-text-muted)" :size="16" />
        </div>
      </div>
      <p class="mt-2 text-[28px] font-semibold tracking-tight font-poppins" :style="`color:var(--text-heading)`">
        {{ stats.activeUsers.daily.toLocaleString() }}
      </p>
      <p class="mt-1 text-[14px] font-poppins" :style="`color:var(--text-muted)`">
        {{ stats.activeUsers.weekly }} this week
      </p>
    </div>

    <!-- Premium count -->
    <div class="dash-card p-5">
      <div class="flex items-start justify-between">
        <p class="text-[14px] uppercase tracking-[0.16em] font-semibold font-poppins" :style="`color:var(--text-subtle)`">Premium</p>
        <div class="size-8 rounded-lg flex items-center justify-center" style="background:var(--surface-raised)">
          <AppIconsax name="Crown1" color="var(--color-text-muted)" :size="16" />
        </div>
      </div>
      <p class="mt-2 text-[28px] font-semibold tracking-tight font-poppins" :style="`color:var(--text-heading)`">
        {{ stats.subscriptions.PREMIUM.toLocaleString() }}
      </p>
      <p class="mt-1 text-[14px] font-poppins" :style="`color:var(--text-muted)`">
        {{ stats.subscriptions.GOLD }} Gold · {{ stats.subscriptions.FREE }} Free
      </p>
    </div>

  </div>
</template>
