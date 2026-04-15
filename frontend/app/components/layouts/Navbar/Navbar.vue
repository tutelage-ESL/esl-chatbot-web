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
    <div class="container-lg layout-padding-lg fixed top-0 left-1/2 transform -translate-x-1/2 mt-8 z-9999">
        <header id="site-navbar"
            class="h-15.25 max-md:shadow-sm md:bg-[#EFEFEF]/50 backdrop-blur-[5px] px-4 py-2 rounded-full flex items-center justify-between ">
            <div class="w-29.75 h-4 md:w-42.25 md:h-5.75 md-lg:max-lg:w-35 lg:w-42.25 lg:h-5.75">
                <AppLink to="/" @click.prevent="useScrollToTop">
                    <!-- <AppImage src="/images/logo/smileMates.svg" alt="Smile Mates Logo" width="169" height="23" /> -->
                </AppLink>
            </div>

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
                <AppButton aria-label="log in button" to="/signin" variant="primary"
                    class-list="w-21 h-7.75 md:w-32 md:h-11.25 text-white text-sm font-medium">
                    Log In
                </AppButton>
                <div class="md-lg:hidden">
                    <LayoutNavbarMenu :nav-items="navItems" :active-link="activeLink" />
                </div>
            </div>
        </header>
    </div>
</template>