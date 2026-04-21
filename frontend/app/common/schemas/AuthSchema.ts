import zod from "zod"


export const signInSchema = zod.object({
    username: zod.string().min(1, 'Username is required'),
    password: zod.string().min(1, 'Password is required'),
})


export const signUpSchema = zod.object({
    username: zod.string().min(1, 'Username is required'),
    email: zod.string().email('Invalid email address').min(1, 'Email is required'),
    password: zod.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: zod.string().min(8, 'Confirm Password must be at least 8 characters long'),
    displayName: zod.string().min(1, 'Display Name is required'),
}).refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
})

export type SignInSchema = zod.infer<typeof signInSchema>
export type SignUpSchema = zod.infer<typeof signUpSchema>
