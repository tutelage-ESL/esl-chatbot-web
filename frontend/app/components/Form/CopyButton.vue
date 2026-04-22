<template>
  <button type="button"
    class="h-7.25 aspect-square  transition-colors grid place-content-center bg-primary-400 hover:bg-primary-500 rounded-lg"
    @click.stop="handleCopyToClipboard">
    <Transition name="icon-pop" mode="out-in">
      <AppIconsax v-if="!showCoppied" name="Copy" size="20" color="white" />
      <AppIconsax v-else name="CopySuccess" size="20" color="white" />
    </Transition>
  </button>
</template>

<script setup lang="ts">

const { value } = defineProps<{
  value?: string | number;
}>()
const showCoppied = ref(false)

const handleCopyToClipboard = () => {
  showCoppied.value = true;
  if (value !== undefined) {
    useCopyToClipboard(value);
  }

  setTimeout(() => {
    showCoppied.value = false;
  }, 2000);
}


</script>

<style scoped>
.icon-pop-enter-active,
.icon-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.icon-pop-enter-from,
.icon-pop-leave-to {
  opacity: 0;
  transform: scale(0.6) rotate(-90deg);
}
</style>
