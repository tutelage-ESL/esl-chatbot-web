import zod from "zod"

export const signInSchema = zod.object({
    username: zod.string().min(1, 'Username is required'),
    password: zod.string().min(1, 'Password is required'),
})

export const signUpSchema = zod.object({
    username: zod.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be at most 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: zod.string().email('Invalid email address').min(1, 'Email is required'),
    password: zod.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: zod.string().min(8, 'Confirm Password must be at least 8 characters long'),
    displayName: zod.string().min(1, 'Display Name is required').max(100, 'Display name must be at most 100 characters'),
    acceptAgreement: zod.literal(true, { message: 'You must accept the Terms of Service to create an account' }),
}).refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
})

export const forgotPasswordSchema = zod.object({
    email: zod.string().email('Invalid email address').min(1, 'Email is required'),
})

export const verifyOtpSchema = zod.object({
    email: zod.string().email('Invalid email address'),
    otp: zod.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
})

export const resetPasswordSchema = zod.object({
    email: zod.string().email('Invalid email address'),
    otp: zod.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
    newPassword: zod.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: zod.string().min(8, 'Confirm Password must be at least 8 characters long'),
}).refine((data: { newPassword: string; confirmPassword: string }) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
})

export const setPasswordSchema = zod.object({
    newPassword: zod.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: zod.string().min(8, 'Confirm Password must be at least 8 characters long'),
}).refine((data: { newPassword: string; confirmPassword: string }) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
})

export const verifyEmailSchema = zod.object({
    email: zod.string().email('Invalid email address'),
    otp: zod.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
})

export const googleUsernameSchema = zod.object({
    username: zod.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be at most 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    acceptAgreement: zod.literal(true, { message: 'You must accept the Terms of Service to create an account' }),
})

export type SignInSchema = zod.infer<typeof signInSchema>
export type SignUpSchema = zod.infer<typeof signUpSchema>
export type ForgotPasswordSchema = zod.infer<typeof forgotPasswordSchema>
export type VerifyOtpSchema = zod.infer<typeof verifyOtpSchema>
export type ResetPasswordSchema = zod.infer<typeof resetPasswordSchema>
export type SetPasswordSchema = zod.infer<typeof setPasswordSchema>
export type GoogleUsernameSchema = zod.infer<typeof googleUsernameSchema>
export type VerifyEmailSchema = zod.infer<typeof verifyEmailSchema>
export type AcceptAgreementInput =
    | { username: string; password: string; idToken?: undefined }
    | { idToken: string; username?: undefined; password?: undefined }
