<script setup lang="ts">
import { signInSchema, type SignInSchema } from '~/common/schemas/AuthSchema'
import { useAuthStore } from '~~/stores/auth'
import { toast } from 'vue-sonner'

definePageMeta({
    layout: 'auth',
    guestOnly: true,
})

const authStore = useAuthStore()
const router = useRouter()

const formData = reactive<SignInSchema>({
    username: '',
    password: '',
})

const serverError = ref<string>('')

const handleSubmit = async () => {
    serverError.value = ''
    const response = await authStore.signIn(formData)

    if (response.success) {
        router.push('/dashboard')
    } else {
        serverError.value = response.message || 'Invalid username or password'
    }
}

</script>

<template>
    <LayoutsAuthFormLayout
        title="Welcome back"
        subtitle="Sign in to continue your English learning journey."
        footer-text="Don't have an account?"
        footer-link-text="Create one"
        footer-link-to="/sign-up"
    >
        <Form :schema="signInSchema" :form-data="formData" @submit="handleSubmit" class="flex flex-col gap-5">
            <template #default="{ errors }">
                <FormInput
                    id="username"
                    label="Username"
                    placeholder="Enter your username"
                    v-model="formData.username"
                    :error="errors.username"
                    required
                />

                <FormInput
                    id="password"
                    type="password"
                    label="Password"
                    placeholder="Enter your password"
                    v-model="formData.password"
                    :error="errors.password"
                    required
                />

                <div class="flex justify-end -mt-1">
                    <NuxtLink to="/forgot-password" class="text-sm font-medium text-brand-ink hover:text-brand-primary transition-colors">
                        Forgot password?
                    </NuxtLink>
                </div>

                <FormServerError :error="serverError" />

                <AppButton
                    type="submit"
                    variant="primary"
                    size="52"
                    radius="full"
                    :loading="authStore.isLoading"
                    class-list="w-full mt-2"
                    aria-label="Sign in"
                >
                    Sign in
                </AppButton>
            </template>
        </Form>

        <template #alt>
            <FormGoogleButton label="Continue with Google" />
        </template>
    </LayoutsAuthFormLayout>
</template>
