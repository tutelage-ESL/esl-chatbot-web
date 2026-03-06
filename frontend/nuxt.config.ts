import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
 compatibilityDate: '2025-07-15',
 devtools: { enabled: true },
 css: ['./app/assets/css/main.css'],

 devServer: {
   port: 3010
 },

 vite: {
    plugins: [
      tailwindcss(),
    ],
  },

 experimental: {
 appManifest: false
},

 modules: ['@nuxt/image'],
})