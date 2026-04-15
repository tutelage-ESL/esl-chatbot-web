<script setup lang="ts">
import { Menu, X } from 'lucide-vue-next';
import { onMounted, onUnmounted, watch, nextTick } from 'vue';
import type { NavItemTypes } from '~/common/types/nav-links-type';


defineProps<{
  navItems: NavItemTypes[];
  activeLink: string;
}>();

const isOpen = ref(false);
const topOffset = ref(0);

const updateTopOffset = () => {
  const el = document.getElementById('site-navbar');
  if (el) {
    const rect = el.getBoundingClientRect();
    topOffset.value = Math.ceil(rect.bottom);
  } else {
    topOffset.value = 0;
  }
};

const toggleMenu = async () => {
  isOpen.value = !isOpen.value;
  await nextTick();
  if (isOpen.value) {
    updateTopOffset();
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

const closeMenu = () => {
  isOpen.value = false;
  document.body.style.overflow = '';
};

onMounted(() => {
  updateTopOffset();
  window.addEventListener('resize', updateTopOffset);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateTopOffset);
  document.body.style.overflow = '';
});

watch(isOpen, (val) => {
  if (!val) document.body.style.overflow = '';
});
</script>

<template>
  <div>
    <button aria-label="toggle menu" @click="toggleMenu" class="py-2">
      <Menu v-if="!isOpen" :size="32"/>
      <X v-else :size="32"/>
    </button>

    <teleport to="body">
      <transition enter-active-class="transition-opacity duration-300 ease-out" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition-opacity duration-300 ease-in"
        leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="isOpen" :style="{ top: topOffset + 'px' }"
          class="md-lg:hidden h-full fixed left-0 top-0 right-0 -translate-y-25 bg-background z-999 layout-padding-lg pt-30 max-md:pl-7 overflow-auto">
          <nav>
            <ul class="flex flex-col gap-6">
              <li v-for="item in navItems" :key="item.name">
                <AppLink :to="item.link" @click="closeMenu"
                  class="block text-lg font-semibold text-black hover:text-primary-400 transition-colors duration-200 text-left"
                  :class="{ 'text-primary-400': activeLink === item.link }">
                  {{ item.name }}
                </AppLink>
              </li>
            </ul>
          </nav>
        </div>
      </transition>
    </teleport>
  </div>
</template>