<template>
  <VsxIcon :icon-name="name" :size="size" :color="color" :type="type" />
</template>

<script setup lang="ts">
import type { SvgBasedIconName } from '@/common/types/iconsax-types';
import { VsxIcon } from 'vue-iconsax';
const { name, color = '#000', size = 20, type = 'linear' } = defineProps<{
  name: SvgBasedIconName,
  color?: string,
  size?: number | string,
  type?: 'linear' | 'outline' | 'bold' | 'bulk' | 'broken' | 'two-tone';
}>()
</script>
