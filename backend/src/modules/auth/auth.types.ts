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
  acceptAgreement: true;
}

export interface GoogleAuthInput {
  idToken: string;
  username?: string;
  acceptAgreement?: boolean;
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
  /** When the dashboard guide was finished or skipped (ISO); null = not yet, show it. */
  guideSeenAt: string | null;
  subscription: {
    plan: Plan;
    status: SubStatus;
  } | null;
}

/** Both tokens plus when each expires (ISO-8601), so clients can refresh ahead of time. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

/** POST /auth/refresh — the refresh-token fields are present only when it was rotated. */
export interface RefreshResult {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
}

export interface LoginResponse extends TokenPair {
  user: AuthUser;
}

// Returned when a Google user doesn't exist yet and needs to choose a username
export interface GoogleNeedsRegistration {
  needsRegistration: true;
  profile: GoogleProfile;
}

export interface GoogleLoginResponse extends TokenPair {
  needsRegistration: false;
  user: AuthUser;
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

// Re-accept the current Terms after a login was blocked with needsAgreement.
// Either re-validate password credentials (LOCAL) or a Google ID token (Google
// accounts, which have no password). Exactly one variant is supplied.
export type AcceptAgreementInput =
  | { username: string; password: string; idToken?: undefined }
  | { idToken: string; username?: undefined; password?: undefined };

export interface AgreementContent {
  version: string;
  effectiveDate: string;
  text: string;
}
