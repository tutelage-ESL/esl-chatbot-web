<template>
  <component :is="to ? link : 'button'" :to="to" :class="mergedClasses" :disabled="loading || attrs.disabled" v-bind="attrs">
    <LoaderCircle v-if="loading" class="animate-spin" aria-hidden="true"/>
    <template v-else>
      <slot name="before" />
      <span v-if="text" :class="textClassList">{{ text }}</span>
      <slot />
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { twMerge } from "tailwind-merge";
import { buttonRadiusClasses, buttonSizeClasses, variantClasses, type ButtonHeight, type ButtonRadius, type Variant } from "~~/common/types/button-types";
import type { RouteLocationRaw } from "vue-router";
import { LoaderCircle } from "lucide-vue-next";

defineOptions({
  inheritAttrs: false
})

type ButtonProps = {
  to?: RouteLocationRaw;
  loading?: boolean
  text?: string
  size?: ButtonHeight
  variant?: Variant
  radius?: ButtonRadius
  classList?: string
  textClassList?: string;
  icon?: string;
  iconPosition?: 'start' | 'end'
  iconClassList?: string;
}

const attrs = useAttrs()

const link = resolveComponent("NuxtLink");

const props = withDefaults(
  defineProps<ButtonProps>(),
  {
    variant: "primary",
    size: "48",
    iconPosition: 'end',
    radius: 'full',
  }
);

const mergedClasses = computed(() => {
  const baseClass = `flex items-center justify-center px-6 py-1.5 ${attrs.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`
  const variant = variantClasses[props.variant];
  const size = buttonSizeClasses[props.size];
  const radius = buttonRadiusClasses[props.radius];
  const defaultClasses = ['flex', 'items-center', 'group', 'whitespace-nowrap', 'transition-all', 'duration-500']
  if (props.iconPosition === 'end' && props.icon) defaultClasses.push('flex-row-reverse', 'gap-2')


  return twMerge(baseClass, variant, size, radius, defaultClasses, props.classList)
}
);
</script>
