import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    BASE_URL: import.meta.env.BASE_URL,
    public: {
      googleClientId: '',   // populated from NUXT_PUBLIC_GOOGLE_CLIENT_ID in .env
    },
  },
  devServer: {
    port: 3001,
  },

  vite: {
    plugins: [
      tailwindcss()
    ]
  },
 shadcn: {
    prefix: 'Ui',
    componentDir: [
      '@/components/ui',
      {
        path: '@/components/ai',
        prefix: 'Ai',
      },
    ],
  },
  modules: ['@pinia/nuxt', '@nuxt/image', 'shadcn-nuxt', 'nuxt-marquee']
})