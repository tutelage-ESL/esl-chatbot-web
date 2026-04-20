<template>
  <div :class="classes">
    <slot v-if="!htmlContent"></slot>
    <div class="html-content" v-else v-html="htmlContent"></div>
  </div>
</template>
<script setup lang="ts">
import { colorClasses, fontFamilyClasses, sizeClasses, weightClasses, type TextProps } from '@/common/types/text-types';
import { twMerge } from 'tailwind-merge';

const props = withDefaults(defineProps<TextProps>(), {
  size: '16',
  weight: 'normal',
  color: 'black',
  fontFamily: 'poppins',
})

const otherClasses = computed(() => {
  let classes = '';
  if (props.capitalize) classes += ' capitalize';
  if (props.uppercase) classes += ' uppercase';
  if (props.underline) classes += ' underline';
  if (props.italic) classes += ' italic';
  return classes;
});

const classes = computed(() => twMerge(sizeClasses[props.size], weightClasses[props.weight], colorClasses[props.color], otherClasses.value, fontFamilyClasses[props.fontFamily], props.classList))
</script>
