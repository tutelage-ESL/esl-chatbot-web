<script setup lang="ts">
import { useAuthStore } from '~~/stores/auth'

definePageMeta({
  layout: 'dashboard',
  requiresAuth: true,
})

const authStore = useAuthStore()
const role = computed(() => authStore.getUser?.role ?? 'STUDENT')
</script>

<template>
  <PagesDashboardAdminDashboard v-if="role === 'ADMIN'" />
  <PagesDashboardTutorDashboard v-else-if="role === 'TUTOR'" />
  <PagesDashboardOverviewUserDashboard v-else />
</template>
