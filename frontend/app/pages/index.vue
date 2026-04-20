<template>
  <div>
    <PagesHomeNav />
    <PagesHomeHero />
    <PagesHomeFeatures />
    <PagesHomeHowItWorks />
    <PagesHomeDashboardPreview />
    <PagesHomePricing />
    <PagesHomeFinalCta />
    <PagesHomeFooter />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

useSeoMeta({
  title: 'Tutelage AI — Learn English Smarter',
  description: 'AI-powered conversations, voice practice, and intelligent progress tracking — all in one platform built for serious learners.',
})

onMounted(() => {
  const io = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }),
    { threshold: 0.15 },
  )
  document.querySelectorAll('.reveal').forEach(n => io.observe(n))
  onUnmounted(() => io.disconnect())
})
</script>
