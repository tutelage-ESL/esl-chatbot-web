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
    port: 3000,
  },

  vite: {
    plugins: [
      tailwindcss()
    ]
  },
  shadcn: {
    /**
     * Prefix for all the imported component.
     * @default "Ui"
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * Will respect the Nuxt aliases.
     * @link https://nuxt.com/docs/api/nuxt-config#alias
     * @default "@/components/ui"
     */
    componentDir: '@/components/ui'
  },
  modules: ['@pinia/nuxt', '@nuxt/image', 'shadcn-nuxt']
})