import type { Role, Plan, SubStatus } from "@prisma/client";

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface GoogleAuthInput {
  idToken: string;
  username?: string;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  role: Role;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerified: boolean;
  subscription: {
    plan: Plan;
    status: SubStatus;
  } | null;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// Returned when a Google user doesn't exist yet and needs to choose a username
export interface GoogleNeedsRegistration {
  needsRegistration: true;
  profile: GoogleProfile;
}

export interface GoogleLoginResponse {
  needsRegistration: false;
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export type GoogleAuthResponse = GoogleNeedsRegistration | GoogleLoginResponse;

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
}

export interface LinkGoogleInput {
  idToken: string;
}

export interface SetPasswordInput {
  newPassword: string;
}

export interface VerifyEmailInput {
  email: string;
  otp: string;
}

export interface ResendVerificationInput {
  email: string;
}
