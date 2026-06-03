<script setup lang="ts">
import type { UserRole, SubStatus } from '~/common/types/admin-types'

defineProps<{
  search: string
  role: UserRole | 'ALL'
  subscriptionStatus: SubStatus | 'ALL'
}>()

const emit = defineEmits<{
  'update:search': [val: string]
  'update:role': [val: UserRole | 'ALL']
  'update:subscriptionStatus': [val: SubStatus | 'ALL']
}>()
</script>

<template>
  <div class="flex items-center gap-3 flex-wrap">
    <!-- Search -->
    <FormInput
      id="user-search"
      :model-value="search"
      placeholder="Search name, email, username…"
      icon="SearchNormal1"
      class-list="w-64"
      @update:model-value="emit('update:search', String($event))"
    />

    <!-- Role filter -->
    <UiSelect :model-value="role" @update:model-value="emit('update:role', $event as UserRole | 'ALL')">
      <UiSelectTrigger class="w-36 text-[14px]"><UiSelectValue placeholder="Role" /></UiSelectTrigger>
      <UiSelectContent>
        <UiSelectItem value="ALL">All roles</UiSelectItem>
        <UiSelectItem value="STUDENT">Student</UiSelectItem>
        <UiSelectItem value="TUTOR">Tutor</UiSelectItem>
        <UiSelectItem value="ADMIN">Admin</UiSelectItem>
      </UiSelectContent>
    </UiSelect>

    <!-- Status filter -->
    <UiSelect :model-value="subscriptionStatus" @update:model-value="emit('update:subscriptionStatus', $event as SubStatus | 'ALL')">
      <UiSelectTrigger class="w-40 text-[14px]"><UiSelectValue placeholder="Status" /></UiSelectTrigger>
      <UiSelectContent>
        <UiSelectItem value="ALL">All statuses</UiSelectItem>
        <UiSelectItem value="ACTIVE">Active</UiSelectItem>
        <UiSelectItem value="INACTIVE">Inactive</UiSelectItem>
        <UiSelectItem value="CANCELLED">Cancelled</UiSelectItem>
        <UiSelectItem value="PAST_DUE">Past due</UiSelectItem>
      </UiSelectContent>
    </UiSelect>

   
  </div>
</template>
