<script setup lang="ts">

import { onMounted, onUnmounted, ref, watch, nextTick, computed } from 'vue';
import { CircleUserRound, User2Icon } from 'lucide-vue-next';
import { onClickOutside } from '@vueuse/core';
import { navItems } from '~/common/data/nav-links';

const activeLink = ref<string>('');
const route = useRoute();
const router = useRouter();
const handleLinkClick = (linkName: string) => {
    activeLink.value = linkName;
};

let observer: IntersectionObserver | null = null;

const setupObserver = async () => {
    await nextTick();

    if (observer) {
        observer.disconnect();
    }

    const options = {
        root: null,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    };

    observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                activeLink.value = `/#${id}`;
            }
        });
    }, options);

    navItems.forEach((item) => {
        const id = item.link.split('#')[1];
        if (id) {
            const el = document.getElementById(id);
            if (el) observer?.observe(el);
        }
    });
};


onMounted(() => {
    setupObserver();

    // Handle initial hash on page load
    if (route.hash) {
        setTimeout(() => {
            const element = document.querySelector(route.hash);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                activeLink.value = `/${route.hash}`;
            }
        }, 100);
    }
});

// Re-setup observer when route changes
watch(() => route.path, () => {
    setupObserver();
    if (route.path !== '/') {
        activeLink.value = '';
    }
});

onUnmounted(() => {
    if (observer) {
        observer.disconnect();
    }
});
</script>

<template>
    <div class="sticky top-0 z-9999 w-full">
        <div
            class="h-18 max-md:shadow-sm md:bg-[#EFEFEF]/50 backdrop-blur-[5px] px-4 py-2 border-b border-secondary-200/70 dark:border-secondary-700/70 rounded-none flex items-center justify-center   ">
            <header id="site-navbar" class="container-lg layout-padding-lg flex items-center justify-between">
                    <AppLink to="/" @click.prevent="useScrollToTop" class="flex items-center justify-center gap-2">
                        <AppImage src="/only-logo-black-border-yellow-bg.svg" alt="Tutelage Logo"
                            class="size-8.75 md:size-10" />
                        <AppText size="20" weight="bold" classList="text-black">Tutelage AI</AppText>
                    </AppLink>

                <nav class="hidden md-lg:block">
                    <ul class="flex items-center justify-center gap-6">
                        <li v-for="link in navItems" :key="link.name" class="relative">
                            <AppLink v-if="link.name" :to="link.link"
                                class="text-xs lg:text-sm font-semibold text-black transition-transform duration-300 inline-block"
                                :class="{ '-translate-y-0.5 text-primary-400': activeLink === link.link }"
                                @click="handleLinkClick(link.link)">
                                {{ link.name }}
                            </AppLink>
                            <span
                                class="absolute left-1/2 -translate-x-1/2 -bottom-1 h-0.5 bg-primary-400 transition-all duration-300 ease-out"
                                :class="activeLink === link.link ? 'w-full' : 'w-0'"></span>
                        </li>
                    </ul>
                </nav>

                <div class="flex items-center justify-center gap-2">
                    <AppButton size="40" aria-label="Signin button" to="/signin" class-list="cursor-pointer">
                        Get Started
                    </AppButton>
                    <div class="md-lg:hidden">
                        <LayoutNavbarMenu :nav-items="navItems" :active-link="activeLink" />
                    </div>
                </div>
            </header>
        </div>
    </div>
</template>