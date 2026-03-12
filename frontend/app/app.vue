<template>
  <div>
    <NuxtLayout>
      <main>
        <NuxtPage />
      </main>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">

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
