<script setup lang="ts">
import { useAuthStore } from '~~/stores/auth'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const authStore = useAuthStore()
const role = computed(() => authStore.getUser?.role ?? 'STUDENT')
</script>

<template>
  <PagesDashboardClassesAdminClassesView v-if="role === 'ADMIN'" />
  <PagesDashboardClassesTutorClassesView v-else-if="role === 'TUTOR'" />
  <PagesDashboardClassesStudentClassesView v-else />
</template>
