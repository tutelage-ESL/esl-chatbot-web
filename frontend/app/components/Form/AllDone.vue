<script setup lang="ts">
definePageMeta({
  layout: "auth"
});

const props = defineProps({
  buttonText: {
    type: String,
    default: 'Back to Login',
  },
  to: {
    type: String,
    default: '/signin',
  },
});
</script>

<template>
    <div class="w-full flex flex-col items-center justify-center gap-12">
        <div class="size-30 md:size-37 aspect-square rounded-full bg-primary-400 flex items-center justify-center">
            <AppIconsax variant="bold" name="TickCircle" size="80" color="#fff" />
        </div>

        <div class="w-full flex flex-col items-center justify-center gap-14">
            <div class="flex flex-col items-center justify-start gap-2">
                <AppText tag="div" color="black" weight="semibold" size="32" class="">All Done</AppText>
                <AppText tag="div" color="black" weight="medium" class="">Your password has been reset.</AppText>
            </div>
            <AppButton aria-label="Back to Login" variant="primary" class-list="w-full" :to="to">
                {{ buttonText }}
            </AppButton>
        </div>
    </div>
</template>