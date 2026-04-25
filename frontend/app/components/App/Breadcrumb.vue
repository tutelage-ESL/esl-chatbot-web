<script setup lang="ts">
import Breadcrumb from '../ui/breadcrumb/Breadcrumb.vue';
import BreadcrumbItem from '../ui/breadcrumb/BreadcrumbItem.vue';
import BreadcrumbLink from '../ui/breadcrumb/BreadcrumbLink.vue';
import BreadcrumbList from '../ui/breadcrumb/BreadcrumbList.vue';
import BreadcrumbPage from '../ui/breadcrumb/BreadcrumbPage.vue';
import BreadcrumbSeparator from '../ui/breadcrumb/BreadcrumbSeparator.vue';


const props = defineProps<{
  breadcrumbs?: { label: string; to?: string }[]
}>()
</script>

<template>
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem v-for="(breadcrumb, index) in breadcrumbs" :key="index">
        <BreadcrumbLink class="md:text-lg font-medium" v-if="breadcrumb.to" as-child>
          <router-link :to="breadcrumb.to">
            {{ breadcrumb.label }}
          </router-link>
        </BreadcrumbLink>
        <BreadcrumbPage class="md:text-lg font-medium" v-else>
          {{ breadcrumb.label }}
        </BreadcrumbPage>
        <BreadcrumbSeparator v-if="index < (breadcrumbs!.length - 1)" />
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
</template>
