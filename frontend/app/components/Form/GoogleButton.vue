<script setup lang="ts">
import { googleOneTap } from 'vue3-google-login'
import { useAuthStore } from '~~/stores/auth'
import { toast } from 'vue-sonner'

withDefaults(defineProps<{
    label?: string
}>(), {
    label: 'Continue with Google',
})

const authStore = useAuthStore()
const router = useRouter()
const isLoading = ref(false)

const handleClick = async () => {
    isLoading.value = true
    try {
        const clientId = useRuntimeConfig().public.googleClientId as string
        const result = await googleOneTap({ clientId, cancelOnTapOutside: false }) as any
        const idToken = result?.credential

        if (!idToken) {
            toast.error('Google sign-in failed. Please try again.')
            return
        }

        const response = await authStore.googleAuth(idToken)

        if (!response.success) {
            toast.error(response.message || 'Google sign-in failed.')
            return
        }

        if (response.data?.data?.needsRegistration) {
            sessionStorage.setItem('googleIdToken', idToken)
            sessionStorage.setItem('googleProfile', JSON.stringify(response.data.data.profile || {}))
            router.push('/google-username')
            return
        }

        toast.success('Welcome!')
        router.push('/dashboard')
    } catch (err: any) {
        if (err?.error !== 'popup_closed_by_user' && err?.error !== 'cancelled') {
            toast.error('Google sign-in was cancelled or failed.')
        }
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
    <button
        type="button"
        @click="handleClick"
        :disabled="isLoading"
        class="w-full h-13 rounded-full border border-black/15 bg-white hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 font-medium text-brand-ink"
        :aria-label="label"
    >
        <svg class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        <span>{{ isLoading ? 'Please wait…' : label }}</span>
    </button>
</template>
