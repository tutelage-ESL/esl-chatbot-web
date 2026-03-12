<template>
  <component :is="tag" :class="classes">
    <span v-if="hasBadge" class="relative flex items-center justify-center gap-6">
      <span :class="twMerge('bg-primary-400 shrink-0', badgeSizeClasses)" />
      <slot v-if="!htmlContent"></slot>
      <span class="html-content" v-else v-html="htmlContent"></span>
    </span>
    <slot v-else-if="!htmlContent"></slot>
    <span class="html-content" v-else v-html="htmlContent"></span>
  </component>
</template>

<script setup lang="ts">
import { twMerge } from 'tailwind-merge';

type TextSize = '14' | '16' | '18' | '20' | '24' | '32' | '40' | '48' | '64';
type TextWeight = 'light' | 'medium' | 'normal' | 'semibold' | 'bold';
type TextColor = 'white' | 'black' | 'base' | 'primary-500';
type FontFamily = 'inter' | 'source-serif';
type BadgeSize = 'sm' | 'md' | 'lg' | 'lg-with-break'; // New type for badge sizes

const sizeClasses: Record<TextSize, string> = {
  '14': 'text-sm',
  '16': 'text-base',
  "18": 'lg:text-lg text-base',
  "20": 'lg:text-xl text-lg',
  '24': 'lg:text-2xl text-xl',
  '32': 'lg:text-3.5xl text-2xl',
  '40': 'lg:text-4.5xl text-3.5xl',
  '48': 'lg:text-5xl text-4.5xl',
  '64': 'lg:text-6.5xl text-5xl',
}

const weightClasses: Record<TextWeight, string> = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

const colorClasses: Record<TextColor, string> = {
  'black': 'text-black',
  'white': 'text-white',
  'base': 'text-base-neutral-500',
  'primary-500': 'text-primary-500',
}

const fontFamilyClasses: Record<FontFamily, string> = {
  'source-serif': 'font-source-serif',
  'inter': 'font-inter',
}

// Map badge sizes to Tailwind classes
const badgeSizeClass: Record<BadgeSize, string> = {
  lg: 'h-[30px] md:h-[48px] w-[8px] md:w-[10px]',
  md: 'h-[31px] w-[10px]',
  sm: 'h-[32px] w-[5px]',
  "lg-with-break": 'h-[58px] md:h-[48px] w-[8px] md:w-[10px]' //In Mobile screens the title breaks into two lines if its too long, in that case use lg-with-break so the badge height matches the text height
};

type TextProps = {
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div' | 'pre';
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  fontFamily?: FontFamily;
  classList?: string;
  htmlContent?: string;
  capitalize?: boolean;
  uppercase?: boolean;
  underline?: boolean;
  italic?: boolean;
  hasBadge?: boolean;
  badgeSize?: BadgeSize; // Updated to use predefined sizes
}


const props = withDefaults(defineProps<TextProps>(), {
  size: '16',
  weight: 'normal',
  color: 'white',
  fontFamily: 'inter',
})


const otherClasses = computed(() => {
  let classes = '';
  if (props.capitalize) {
    classes += ' capitalize';
  }
  if (props.uppercase) {
    classes += ' uppercase';
  }
  if (props.underline) {
    classes += ' underline';
  }
  if (props.italic) {
    classes += ' italic';
  }
  return classes;
});

const tag = computed(() => {
  if (props.tag) return props.tag;
  return 'div';
});

const classes = computed(() => twMerge(sizeClasses[props.size], weightClasses[props.weight], colorClasses[props.color], otherClasses.value, fontFamilyClasses[props.fontFamily], props.classList))

// Compute badge size classes dynamically
const badgeSizeClasses = computed(() => {
  if (!props.badgeSize || !badgeSizeClass[props.badgeSize]) return '';
  return badgeSizeClass[props.badgeSize];
});
</script>
