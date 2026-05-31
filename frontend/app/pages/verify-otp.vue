<script setup lang="ts">
import { verifyOtpSchema, type VerifyOtpSchema } from '~/common/schemas/AuthSchema'
import { useAuthStore } from '~~/stores/auth'
import { toast } from 'vue-sonner'

definePageMeta({
    layout: 'auth',
    guestOnly: true,
})

const authStore = useAuthStore()
const router = useRouter()

const formData = reactive<VerifyOtpSchema>({
    email: '',
    otp: '',
})

const serverError = ref<string>('')
const otpError = ref<string>('')
const resendCooldown = ref(0)
let cooldownInterval: ReturnType<typeof setInterval> | null = null

const startCooldown = () => {
    resendCooldown.value = 60
    cooldownInterval = setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0) {
            clearInterval(cooldownInterval!)
            cooldownInterval = null
        }
    }, 1000)
}

onUnmounted(() => {
    if (cooldownInterval) clearInterval(cooldownInterval)
})

onMounted(() => {
    const savedEmail = sessionStorage.getItem('resetEmail')
    if (!savedEmail) {
        router.replace('/forgot-password')
        return
    }
    formData.email = savedEmail
})

const maskedEmail = computed(() => {
    if (!formData.email) return ''
    const [name, domain] = formData.email.split('@')
    if (!name || !domain) return formData.email
    const masked = name.length <= 2 ? name : name[0] + '***' + name[name.length - 1]
    return `${masked}@${domain}`
})

const handleSubmit = () => {
    serverError.value = ''
    otpError.value = ''
    sessionStorage.setItem('resetOtp', formData.otp)
    router.push('/reset-password')
}

const handleResend = async () => {
    const response = await authStore.forgotPassword({ email: formData.email })
    if (response.success) {
        toast.success('A new code has been sent to your email.')
        startCooldown()
    } else {
        serverError.value = response.message || 'Could not resend the code.'
    }
}
</script>

<template>
    <LayoutsAuthFormLayout
        title="Verify your email"
        :subtitle="`We sent a 6-digit code to ${maskedEmail}. Enter it below to continue.`"
        footer-text="Wrong email?"
        footer-link-text="Start over"
        footer-link-to="/forgot-password"
    >
        <Form :schema="verifyOtpSchema" :form-data="formData" @submit="handleSubmit" class="flex flex-col gap-5">
            <template #default="{ errors }">
                <FormVerificationInput v-model="formData.otp" :error="errors.otp || otpError" />

                <FormServerError :error="serverError" />

                <AppButton
                    type="submit"
                    variant="primary"
                    size="52"
                    radius="full"
                    :loading="authStore.isLoading"
                    class-list="w-full mt-2"
                    aria-label="Verify code"
                >
                    Verify code
                </AppButton>

                <p class="text-sm text-brand-sub text-center">
                    Didn't get a code?
                    <button
                        type="button"
                        @click="handleResend"
                        :disabled="resendCooldown > 0"
                        class="font-semibold transition-colors cursor-pointer"
                        :class="resendCooldown > 0 ? 'text-brand-sub cursor-not-allowed' : 'text-brand-ink hover:text-brand-primary'"
                        aria-label="Resend code"
                    >
                        {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend' }}
                    </button>
                </p>
            </template>
        </Form>
    </LayoutsAuthFormLayout>
</template>
