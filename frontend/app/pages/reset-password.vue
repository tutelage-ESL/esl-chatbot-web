<script setup lang="ts">
import { resetPasswordSchema, type ResetPasswordSchema } from '~/common/schemas/AuthSchema'
import { useAuthStore } from '~~/stores/auth'

definePageMeta({
    layout: 'auth',
    guestOnly: true,
})

const authStore = useAuthStore()
const router = useRouter()

const formData = reactive<ResetPasswordSchema>({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
})

const serverError = ref<string>('')
const isDone = ref(false)
let redirectTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
    const savedEmail = sessionStorage.getItem('resetEmail')
    const savedOtp = sessionStorage.getItem('resetOtp')

    if (!savedEmail || !savedOtp) {
        router.replace('/forgot-password')
        return
    }

    formData.email = savedEmail
    formData.otp = savedOtp
})

onUnmounted(() => {
    if (redirectTimer) clearTimeout(redirectTimer)
})

const handleSubmit = async () => {
    serverError.value = ''
    const response = await authStore.resetPassword(formData)

    if (response.success) {
        sessionStorage.removeItem('resetEmail')
        sessionStorage.removeItem('resetOtp')
        isDone.value = true
        redirectTimer = setTimeout(() => {
            router.push('/signin')
        }, 3000)
    } else {
        serverError.value = response.message || 'Invalid or expired code. Please try again.'
    }
}
</script>

<template>
    <FormAllDone v-if="isDone" button-text="Back to sign in" to="/signin" />

    <LayoutsAuthFormLayout
        v-else
        title="Set a new password"
        subtitle="Choose a strong password you haven't used before."
        footer-text="Changed your mind?"
        footer-link-text="Back to sign in"
        footer-link-to="/signin"
    >
        <Form :schema="resetPasswordSchema" :form-data="formData" @submit="handleSubmit" class="flex flex-col gap-5">
            <template #default="{ errors }">
                <FormInput
                    id="newPassword"
                    type="password"
                    label="New password"
                    placeholder="At least 8 characters"
                    v-model="formData.newPassword"
                    :error="errors.newPassword"
                    required
                />

                <FormInput
                    id="confirmPassword"
                    type="password"
                    label="Confirm password"
                    placeholder="Repeat your new password"
                    v-model="formData.confirmPassword"
                    :error="errors.confirmPassword"
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
                    aria-label="Reset password"
                >
                    Reset password
                </AppButton>
            </template>
        </Form>
    </LayoutsAuthFormLayout>
</template>
