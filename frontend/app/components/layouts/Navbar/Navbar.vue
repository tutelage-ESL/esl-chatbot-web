<template>
    <header
        class="fixed top-0 inset-x-0 z-50 border-b transition-all duration-300"
        :class="scrolled ? 'bg-brand-ink/60 backdrop-blur-xl border-neutral-50/10' : 'bg-transparent border-transparent'"
    >
        <div class="container-lg layout-padding-lg h-16 flex items-center justify-between">
            <AppLink to="/" class="flex items-center gap-2 group">
                <AppImage src="/only-logo-black-border-yellow-bg.svg" alt="Tutelage AI Logo" class="size-8" />
                <AppText size="15" weight="semibold" color="white" class-list="tracking-tight">
                    Tutelage <span class="text-brand-primary">AI</span>
                </AppText>
            </AppLink>

            <nav class="hidden md:flex items-center gap-7">
                <AppLink
                    v-for="item in navLinks"
                    :key="item.label"
                    :to="item.to"
                    class="text-[13px] font-medium text-neutral-50/70 transition-colors hover:text-brand-primary"
                >
                    {{ item.label }}
                </AppLink>
            </nav>

            <div class="flex items-center gap-2">
                <AppButton to="/signin" variant="dark-ghost" size="38" class-list="hidden sm:inline-flex px-3.5 text-[13px]">
                    Sign in
                </AppButton>
                <AppButton to="#cta" variant="brand" size="38" class-list="px-3.5 text-[13px] gap-1.5">
                    <span>Get Started</span>
                    <Icon icon="lucide:arrow-right" width="13" />
                </AppButton>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const scrolled = ref(false)

const navLinks = [
    { label: 'Features', to: '#features' },
    { label: 'How It Works', to: '#how' },
    { label: 'Dashboard', to: '#dashboard' },
    { label: 'Pricing', to: '#pricing' },
]

const onScroll = () => {
    scrolled.value = window.scrollY > 20
}

onMounted(() => {
    window.addEventListener('scroll', onScroll)
    onScroll()
})

onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
})
</script>