<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  requiresAuth: true,
})

const { isAdmin, isTutor } = useRole()
</script>

<template>
  <PagesDashboardAdminDashboard v-if="isAdmin" />
  <PagesDashboardTutorDashboard v-else-if="isTutor" />
  <PagesDashboardOverviewUserDashboard v-else />
</template>
