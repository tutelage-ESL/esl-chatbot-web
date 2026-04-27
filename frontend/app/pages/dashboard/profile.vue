<script setup lang="ts">
import { useAuthStore } from '~~/stores/auth'

definePageMeta({ layout: 'dashboard', requiresAuth: true })

const authStore = useAuthStore()
const user = computed(() => authStore.getUser)

const initials = computed(() => {
  const name = user.value?.username ?? user.value?.email ?? 'U'
  return name.charAt(0).toUpperCase()
})
</script>

<template>
  <div class="h-full overflow-y-auto p-5 sm:p-7 space-y-5">
    <!-- Header -->
    <div class="animate-card-enter" style="--delay:0ms">
      <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-brand-ink dark:text-white font-poppins">Profile</h1>
      <p class="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1 font-poppins">You, in English.</p>
    </div>

    <!-- User card -->
    <div class="dash-card p-6 flex items-center gap-5 flex-wrap animate-card-enter" style="--delay:80ms">
      <div class="w-20 h-20 rounded-2xl bg-linear-to-br from-brand-primary to-[#b45309] text-white flex items-center justify-center text-[28px] font-semibold font-poppins shrink-0">
        {{ initials }}
      </div>
      <div class="flex-1 min-w-50">
        <p class="text-[20px] font-semibold tracking-tight text-brand-ink dark:text-white font-poppins">
          {{ user?.username ?? 'User' }}
        </p>
        <p class="text-[13px] text-zinc-500 dark:text-zinc-400 font-poppins">
          {{ user?.email ?? '—' }} · Erbil, Kurdistan
        </p>
        <div class="mt-2 flex items-center gap-2 flex-wrap">
          <span class="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary uppercase tracking-wider font-poppins">
            B2 · Upper-int
          </span>
          <span class="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 font-poppins">
            Native: Kurdish, Arabic
          </span>
          <span class="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 font-poppins">
            Premium
          </span>
        </div>
      </div>
      <AppButton variant="primary" size="38" radius="8" icon="Edit" :icon-config="{color: 'white'}" text="Edit profile" />
    </div>

    <!-- Stats row -->
    <div class="grid md:grid-cols-3 gap-4">
      <div class="dash-card p-5 animate-card-enter" style="--delay:160ms">
        <p class="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">Member since</p>
        <p class="mt-2 text-[20px] font-semibold tracking-tight text-brand-ink dark:text-white font-poppins">Jan 2026</p>
        <p class="text-[11.5px] text-zinc-400 font-poppins">124 days · 42 hours of practice</p>
      </div>
      <div class="dash-card p-5 animate-card-enter" style="--delay:220ms">
        <p class="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">Learning goals</p>
        <p class="mt-2 text-[13px] text-brand-ink dark:text-white leading-relaxed font-poppins">
          Pass IELTS Band 7 · Work in English-speaking teams · Read novels comfortably.
        </p>
      </div>
      <div class="dash-card p-5 animate-card-enter" style="--delay:280ms">
        <p class="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold font-poppins">Daily target</p>
        <p class="mt-2 text-[20px] font-semibold tracking-tight text-brand-ink dark:text-white font-poppins">25 min</p>
        <p class="text-[11.5px] text-zinc-400 font-poppins">Reminder at 9:00 AM · Mon–Sat</p>
      </div>
    </div>
  </div>
</template>
