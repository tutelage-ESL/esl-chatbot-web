<script setup lang="ts">
import { useAuthStore } from '~~/stores/auth'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const authStore = useAuthStore()
const router    = useRouter()

const sections = [
  {
    title: 'Account',
    items: [
      { label: 'Email',        value: 'aram@tutelage.krd' },
      { label: 'Password',     value: '••••••••••' },
      { label: 'Subscription', value: 'Premium · Renews Apr 23, 2026' },
    ],
  },
  {
    title: 'Learning',
    items: [
      { label: 'Current level',       value: 'B2 · Upper-Intermediate' },
      { label: 'Daily target',        value: '25 minutes' },
      { label: 'Interface language',  value: 'English' },
      { label: 'Voice',               value: 'Maya (American, neutral)' },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { label: 'Daily reminder',  value: '9:00 AM · Mon–Sat' },
      { label: 'Streak at risk',  value: 'Evening push' },
      { label: 'Weekly summary',  value: 'Sunday 8:00 PM' },
    ],
  },
]

async function signOut() {
  await authStore.signOut()
  router.push('/signin')
}
</script>

<template>
  <div class="p-5 sm:p-7 space-y-5 max-w-3xl">
    <!-- Header -->
    <div class="animate-card-enter" style="--delay:0ms">
      <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-brand-ink dark:text-white font-poppins">Settings</h1>
      <p class="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1 font-poppins">Fine-tune how Tutelage works for you.</p>
    </div>

    <!-- Sections -->
    <div
      v-for="(section, si) in sections"
      :key="section.title"
      class="dash-card overflow-hidden animate-card-enter"
      :style="`--delay:${80 + si * 80}ms`"
    >
      <div class="px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold border-b border-black/5 dark:border-white/5 font-poppins">
        {{ section.title }}
      </div>
      <div class="divide-y divide-black/5 dark:divide-white/5">
        <div
          v-for="item in section.items"
          :key="item.label"
          class="flex items-center justify-between px-5 py-3"
        >
          <p class="text-[13px] text-brand-ink dark:text-white font-poppins">{{ item.label }}</p>
          <div class="flex items-center gap-3">
            <p class="text-[12.5px] text-zinc-500 dark:text-zinc-400 font-poppins">{{ item.value }}</p>
            <button class="text-[11.5px] font-medium text-brand-primary hover:underline font-poppins">Edit</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sign out -->
    <div class="animate-card-enter" style="--delay:320ms">
      <button
        class="text-[12.5px] font-medium text-rose-500 hover:text-rose-600 transition-colors font-poppins"
        @click="signOut"
      >
        Sign out
      </button>
    </div>
  </div>
</template>
