import { z } from "zod/v4";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters"),
  // Must be exactly true — the user has to accept the current Terms of Service to register.
  acceptAgreement: z.literal(true, {
    message: "You must accept the Terms of Service to create an account",
  }),
});

// Used for both Google login and Google registration (username is only required on first sign-up)
export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  // Required only when creating a brand-new Google account (i.e. when `username`
  // is supplied). Enforced in the service for the create branch — existing
  // Google/merge logins don't need it. Optional here so plain Google logins pass.
  acceptAgreement: z.boolean().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d{6}$/, "OTP must be numeric"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const linkGoogleSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

export const setPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d{6}$/, "OTP must be numeric"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Re-accept the current Terms of Service after a login was blocked with
// needsAgreement. The blocked user holds no token, so they re-prove identity:
// LOCAL accounts resend username+password, Google accounts resend a fresh idToken.
// Exactly one variant must be provided; credentials are re-validated before
// acceptance is recorded and tokens are issued.
export const acceptAgreementSchema = z.union([
  z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
  }),
  z.object({
    idToken: z.string().min(1, "Google ID token is required"),
  }),
]);
