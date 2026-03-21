import type { Role, Plan, SubStatus } from "@prisma/client";

export interface LoginInput {
  username: string;
  password: string;
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
