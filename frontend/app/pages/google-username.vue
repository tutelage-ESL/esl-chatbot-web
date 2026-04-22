<script setup lang="ts">
import { googleUsernameSchema, type GoogleUsernameSchema } from '~/common/schemas/AuthSchema'
import { useAuthStore } from '~~/stores/auth'
import { toast } from 'vue-sonner'

definePageMeta({
    layout: 'auth',
    guestOnly: true,
})

type GoogleProfile = {
    email?: string
    displayName?: string
    avatarUrl?: string | null
}

const authStore = useAuthStore()
const router = useRouter()

const formData = reactive<GoogleUsernameSchema>({
    username: '',
})

const serverError = ref<string>('')
const idToken = ref<string>('')
const profile = ref<GoogleProfile>({})

onMounted(() => {
    const savedToken = sessionStorage.getItem('googleIdToken')
    if (!savedToken) {
        router.replace('/signin')
        return
    }
    idToken.value = savedToken

    const savedProfile = sessionStorage.getItem('googleProfile')
    if (savedProfile) {
        try { profile.value = JSON.parse(savedProfile) } catch { /* ignore */ }
    }
})

const handleSubmit = async () => {
    serverError.value = ''
    const response = await authStore.googleAuth(idToken.value, formData.username)

    if (response.success && !response.data?.needsRegistration) {
        sessionStorage.removeItem('googleIdToken')
        sessionStorage.removeItem('googleProfile')
        toast.success('Welcome!')
        router.push('/dashboard')
    } else {
        serverError.value = response.message || 'Could not complete sign-up. Please try again.'
    }
}
</script>

<template>
    <LayoutsAuthFormLayout
        title="Pick a username"
        :subtitle="profile.email
            ? `You're signing in as ${profile.email}. Choose a username to finish creating your account.`
            : 'Choose a username to finish creating your account.'"
        footer-text="Changed your mind?"
        footer-link-text="Back to sign in"
        footer-link-to="/signin"
    >
        <Form :schema="googleUsernameSchema" :form-data="formData" @submit="handleSubmit" class="flex flex-col gap-5">
            <template #default="{ errors }">
                <FormInput
                    id="username"
                    label="Username"
                    placeholder="e.g. student_ali"
                    v-model="formData.username"
                    :error="errors.username"
                    required
                />

                <FormServerError :error="serverError" />

                <AppButton
                    type="submit"
                    variant="primary"
                    size="52"
                    radius="full"
                    :loading="authStore.isLoading"
                    class-list="w-full mt-2"
                    aria-label="Finish sign up"
                >
                    Finish sign up
                </AppButton>
            </template>
        </Form>
    </LayoutsAuthFormLayout>
</template>
