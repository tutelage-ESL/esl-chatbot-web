<template>
  <div>
    <NuxtLayout>
      <main>
        <NuxtPage />
        <ClientOnly>
          <Toaster />
        </ClientOnly>
      </main>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'

useHead({
  title: 'Esl Chat Bot',
  htmlAttrs: {
    lang: 'en',
  },
  link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  ],

})

useSeo()
</script>
