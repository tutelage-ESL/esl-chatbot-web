<template>
  <div>
    <NuxtLayout>
      <main>
        <NuxtPage />
        <div class="p-10 space-y-4">

          <AppButton size="40" >
            Submit
          </AppButton>
          <AppButton size="40" variant="secondary">
            sec
          </AppButton>
          
          <AppButton size="40" variant="outline">
            outline
          </AppButton>
          
          <AppButton size="40" variant="ghost">
              ghost
            </AppButton>
            
            <AppButton size="40" variant="danger">
              danger
            </AppButton>
            

              <AppButton size="40" variant="primary" type="submit" >
              Submit
            </AppButton>
          </div>

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
