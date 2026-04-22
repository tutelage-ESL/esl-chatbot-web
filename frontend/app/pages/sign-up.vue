<script setup lang="ts">
import { signUpSchema, type SignUpSchema } from '~/common/schemas/AuthSchema'
import { useAuthStore } from '~~/stores/auth'

definePageMeta({
    layout: 'auth',
    guestOnly: true,
})

const authStore = useAuthStore()
const router = useRouter()

const formData = reactive<SignUpSchema>({
    username: '',
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
})

const serverError = ref<string>('')

const handleSubmit = async () => {
    serverError.value = ''
    const response = await authStore.signUp(formData)

    if (response.success) {
        const loginResponse = await authStore.signIn({
            username: formData.username,
            password: formData.password,
        })

        if (loginResponse.success) {
            router.push('/dashboard')
        } else {
            router.push('/signin')
        }
    } else {
        serverError.value = response.message || 'Registration failed. Please try again.'
    }
}

</script>

<template>
    <LayoutsAuthFormLayout
        title="Create your account"
        subtitle="Start practicing English with an AI tutor built for serious learners."
        footer-text="Already have an account?"
        footer-link-text="Sign in"
        footer-link-to="/signin"
    >
        <Form :schema="signUpSchema" :form-data="formData" @submit="handleSubmit" class="flex flex-col gap-5">
            <template #default="{ errors }">

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        id="displayName"
                        label="Display name"
                        placeholder="e.g. Ali Hassan"
                        v-model="formData.displayName"
                        :error="errors.displayName"
                        required
                    />
    
                    <FormInput
                        id="username"
                        label="Username"
                        placeholder="e.g. student_ali"
                        v-model="formData.username"
                        :error="errors.username"
                        required
                    />
                </div>

                <FormInput
                    id="email"
                    has-copy
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    v-model="formData.email"
                    :error="errors.email"
                    required
                />

                <FormInput
                    id="password"
                    type="password"
                    label="Password"
                    placeholder="At least 8 characters"
                    v-model="formData.password"
                    :error="errors.password"
                    required
                />

                <FormInput
                    id="confirmPassword"
                    type="password"
                    label="Confirm password"
                    placeholder="Repeat your password"
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
                    aria-label="Create account"
                >
                    Create account
                </AppButton>

                <p class="text-xs text-brand-sub text-center leading-relaxed">
                    By creating an account, you agree to our
                    <NuxtLink to="/terms" class="font-medium text-brand-ink hover:text-brand-primary">Terms</NuxtLink>
                    and
                    <NuxtLink to="/privacy" class="font-medium text-brand-ink hover:text-brand-primary">Privacy Policy</NuxtLink>.
                </p>
            </template>
        </Form>

        <template #alt>
            <FormGoogleButton label="Sign up with Google" />
        </template>
    </LayoutsAuthFormLayout>
</template>
