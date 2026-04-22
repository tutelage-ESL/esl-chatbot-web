import vue3GoogleLogin from 'vue3-google-login'

export default defineNuxtPlugin((nuxtApp) => {
    const clientId = useRuntimeConfig().public.googleClientId as string | undefined
    if (!clientId) return

    nuxtApp.vueApp.use(vue3GoogleLogin, { clientId })
})
