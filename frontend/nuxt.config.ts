import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~~/assets/css/main.css'],
  runtimeConfig: {
      APP_IDENTIFIER: process.env.VITE_APP_IDENTIFIER,
      BASE_URL: process.env.VITE_BASE_API_URL
  },
  devServer: {
    port: 3020,
  },
  vite: {
    plugins: [
      tailwindcss()
    ]
  }
})
