<script setup lang="ts">
import { useAuthStore } from '~~/stores/auth'
import { toast } from 'vue-sonner'

definePageMeta({
    layout: 'auth',
    guestOnly: true,
})

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const otp = ref('')
const otpError = ref('')
const serverError = ref('')
const isDone = ref(false)
// Whether we must ask the user to type their email — decided once on mount so the
// input doesn't disappear as soon as they start typing into it.
const needsEmail = ref(false)
let redirectTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
    // The user is NOT logged in yet — register doesn't issue tokens. The email to
    // verify is normally carried over from the signup page via sessionStorage.
    // When it's missing (e.g. an unverified user tried to sign in by username),
    // we let them type it in below rather than bouncing them away.
    email.value = sessionStorage.getItem('pendingEmail') ?? ''
    needsEmail.value = !email.value
})

const isValidEmail = computed(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value))

onUnmounted(() => {
    if (redirectTimer) clearTimeout(redirectTimer)
    if (cooldownInterval) clearInterval(cooldownInterval)
})

const maskedEmail = computed(() => {
    if (!email.value) return ''
    const [name, domain] = email.value.split('@')
    if (!name || !domain) return email.value
    const masked = name.length <= 2 ? name : name[0] + '***' + name[name.length - 1]
    return `${masked}@${domain}`
})

const isOtpComplete = computed(() => otp.value.length === 6)

const handleSubmit = async () => {
    serverError.value = ''
    otpError.value = ''

    if (!isValidEmail.value) {
        serverError.value = 'Please enter the email address you registered with.'
        return
    }

    if (!isOtpComplete.value) {
        otpError.value = 'Please enter the full 6-digit code.'
        return
    }

    const response = await authStore.verifyEmail({ email: email.value, otp: otp.value })

    if (response.success) {
        // verifyEmail() persisted the returned tokens — the user is now logged in.
        sessionStorage.removeItem('pendingEmail')
        isDone.value = true
        redirectTimer = setTimeout(() => router.push('/dashboard'), 2500)
    } else {
        otpError.value = response.message || 'Invalid or expired code. Please try again.'
    }
}

const RESEND_COOLDOWN = 60
const resendCooldown = ref(0)
let cooldownInterval: ReturnType<typeof setInterval> | null = null

const startCooldown = () => {
    resendCooldown.value = RESEND_COOLDOWN
    cooldownInterval = setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0) {
            clearInterval(cooldownInterval!)
            cooldownInterval = null
        }
    }, 1000)
}

const handleResend = async () => {
    serverError.value = ''
    if (!isValidEmail.value) {
        serverError.value = 'Enter your email first, then request a new code.'
        return
    }
    const response = await authStore.resendVerification(email.value)
    if (response.success) {
        toast.success('A new verification code has been sent.')
        startCooldown()
    } else {
        serverError.value = response.message || 'Could not resend the code. Please try again.'
    }
}
</script>

<template>
    <!-- Success state -->
    <div v-if="isDone" class="w-full flex flex-col items-center justify-center gap-12">
        <div class="size-30 md:size-37 aspect-square rounded-full bg-primary-400 flex items-center justify-center">
            <AppImage src="/icons/check.svg" class="max-md:size-12" alt="check icon" />
        </div>
        <div class="w-full flex flex-col items-center justify-center gap-14">
            <div class="flex flex-col items-center justify-start gap-2">
                <AppText tag="div" color="black" weight="semibold" size="32">All Done</AppText>
                <AppText tag="div" color="black" weight="medium">Email verified — your free plan is now active.</AppText>
            </div>
            <AppText tag="div" size="13" color="brand-sub" class-list="text-center">
                Taking you to your dashboard…
            </AppText>
        </div>
    </div>

    <!-- Verification form -->
    <LayoutsAuthFormLayout
        v-else
        title="Verify your email"
        :subtitle="needsEmail
            ? 'Enter your email and the 6-digit code we sent you to activate your account.'
            : `We sent a 6-digit code to ${maskedEmail}. Enter it below to activate your account.`"
        footer-text="Already verified?"
        footer-link-text="Sign in"
        footer-link-to="/signin"
    >
        <div class="flex flex-col gap-5">
            <FormInput
                v-if="needsEmail"
                id="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                v-model="email"
                required
            />

            <FormVerificationInput v-model="otp" :error="otpError" />

            <FormServerError :error="serverError" />

            <AppButton
                type="button"
                variant="primary"
                size="52"
                radius="full"
                :loading="authStore.isLoading"
                :disabled="!isOtpComplete || !isValidEmail"
                class-list="w-full mt-2"
                aria-label="Verify email"
                @click="handleSubmit"
            >
                Verify email
            </AppButton>

            <p class="text-sm text-brand-sub text-center">
                Didn't get a code?
                <button
                    type="button"
                    @click="handleResend"
                    :disabled="resendCooldown > 0"
                    class="font-semibold transition-colors cursor-pointer"
                    :class="resendCooldown > 0 ? 'text-brand-sub cursor-not-allowed' : 'text-brand-ink hover:text-brand-primary'"
                    aria-label="Resend verification code"
                >
                    {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend' }}
                </button>
            </p>
        </div>
    </LayoutsAuthFormLayout>
</template>
