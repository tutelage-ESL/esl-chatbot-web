<template>
  <component :is="tag ? tag : to ? 'NuxtLink' : 'button'" :to="to" :class="mergedClasses" :disabled="loading"
    v-bind="attrs" :type="buttonType">
    <Icon v-if="loading" mode="mask" icon="svg-spinners:180-ring-with-bg" class="text-2xl mx-auto" />
    <template v-else>
      <slot name="before" />
      <Iconsax v-if="icon" :name="icon" :color="props.iconConfig?.color" :size="iconSize"
        :type="props.iconConfig?.type" :class="iconMergedClasses"/>
      <span v-if="text" :class="textClassList">{{ text }}</span>
      <slot />
    </template>
  </component>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import Iconsax from "./Iconsax.vue";
import { activeClasses, buttonRadiusClasses, buttonSizeClasses, variantClasses, type ButtonHeight, type ButtonRadius, type Variant } from "@/common/types/button-types";
import type { RouteLocationRaw } from "vue-router";
import { Icon } from "@iconify/vue";
import type { SvgBasedIconName } from "~/common/types/iconsax-types";

defineOptions({
  inheritAttrs: false
})

type ButtonProps = {
  to?: RouteLocationRaw;
  tag?: string;
  loading?: boolean
  text?: string
  size?: ButtonHeight
  variant?: Variant
  radius?: ButtonRadius
  aspect?: 'square' | 'auto'
  classList?: string
  textClassList?: string;
  icon?: SvgBasedIconName;
  active?: boolean;
  activeClassList?: string;
  iconPosition?: 'start' | 'end'
  iconConfig?: {
    color?: string,
    size?: number | string,
    type?: 'linear' | 'outline' | 'bold' | 'bulk' | 'broken' | 'two-tone';
  };
  iconClassList?: string;
}

const attrs = useAttrs()


const props = withDefaults(
  defineProps<ButtonProps>(),
  {
    variant: "primary",
    size: "48",
    iconPosition: 'start',
    radius: '12',
  }
);

const buttonType = computed(() => {
  if (attrs.type) return attrs.type as string;
  return props.to ? undefined : 'button';
})

const iconSize = computed(() => {
  if (!props.icon) return undefined;
  if (props.iconConfig?.size) return props.iconConfig.size;
  switch (props.size) {
    case '24':
      return 16;
    case '28':
      return 16;
    case '32':
      return 18;
    case '36':
      return 20;
    case '48':
      return 24;
    default:
      return 20;
  }
})

const iconMergedClasses = computed(() => {
  const defaultClasses = ['shrink-0']
  if (props.text) defaultClasses.push(props.iconPosition === 'start' ? 'me-2' : 'ms-2')
  return twMerge(defaultClasses, props.iconClassList)
})

const mergedClasses = computed(() => {
  const variant = variantClasses[props.variant];
  const size = buttonSizeClasses[props.size];
  const radius = buttonRadiusClasses[props.radius];
  const defaultClasses = ['font-poppins', 'font-medium', 'flex', 'items-center', 'group', 'whitespace-nowrap', 'transition-all', '**:transition-all', 'duration-400', '**:duration-400', `${props.variant}-button`]
  if (props.aspect === 'square') defaultClasses.push('aspect-square', 'p-0')
  if (props.iconPosition === 'end' && props.icon) defaultClasses.push('flex-row-reverse', 'gap-2')
  if (props.active) defaultClasses.push(props.activeClassList || activeClasses[props.variant]);
  return twMerge(variant, size, radius, defaultClasses, props.classList)
}
);
</script>
