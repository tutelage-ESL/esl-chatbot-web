<script setup lang="ts">
import { toast } from 'vue-sonner';
import { useAuthStore } from '~~/stores/auth';

definePageMeta({
    layout: 'dashboard',
    requiresAuth: true,
})
const router = useRouter()
const authStore = useAuthStore()
const signOut = async () => {
    // show a toaster for 3 seconds then sign out

            await authStore.signOut()
            router.push('/signin')
    // await authStore.signOut()
    // router.push('/signin')
}
</script>

<template>
    <div class="min-h-dvh flex items-center justify-center">
        <AppText size="40" weight="semibold" color="brand-ink">Dashboard</AppText>
        <AppButton variant="primary" @click="signOut">Sign Out</AppButton>
    </div>
</template>
