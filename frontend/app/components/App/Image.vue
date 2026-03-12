<template>
  <NuxtImg v-if="!isSvg" v-bind="attrs" :custom="true" v-slot="{ src, isLoaded, imgAttrs }">
    <img loading="lazy" v-if="isLoaded" v-bind="attrs" :src="src">
    <ClientOnly v-else>
      <img loading="lazy" v-bind="attrs" :src="`https://placehold.co/${imgAttrs.width||600}x${imgAttrs.height||600}`"  alt="placeholder">
    </ClientOnly>
  </NuxtImg>
  <img v-bind="attrs" v-else />
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})
const attrs = useAttrs() as Record<string, string>;


const isSvg = computed(() => {
  return attrs.src?.endsWith('.svg');
});

</script>