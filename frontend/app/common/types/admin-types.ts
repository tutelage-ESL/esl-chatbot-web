export type UserRole = 'STUDENT' | 'TUTOR' | 'ADMIN'
export type SubStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'PAST_DUE'
export type PlanId = 'FREE' | 'GOLD' | 'PREMIUM'
export type PaymentProvider = 'CASH' | 'FIB' | 'STRIPE'
export type IntervalMonths = 1 | 3 | 6 | 12

// ── User list item (GET /users) ───────────────────────────────────────────────

export interface AdminLearnerProfile {
  id: string
  currentLevel: string | null
  targetLevel: string | null
  learningPurpose: string | null
  topicsOfInterest: string[]
  aiPersonality: string | null
  voiceSpeed: number
  autoSpeak: boolean
  uiLanguage: string
  theme: string
  weeklyGoalMinutes: number
  timezone: string
}

export interface AdminUserItem {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl: string | null
  isActive: boolean
  role: UserRole
  phoneNumber: string | null
  createdAt: string
  subscription: {
    plan: PlanId
    status: SubStatus
    currentPeriodEnd: string | null
  } | null
  learnerProfile?: AdminLearnerProfile | null
}

export interface AdminUserListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ── Admin dashboard stats (GET /admin/dashboard) ─────────────────────────────

export interface AdminDashboardData {
  users: {
    total: number
    byRole: { STUDENT: number; TUTOR: number; ADMIN: number }
  }
  subscriptions: { FREE: number; GOLD: number; PREMIUM: number }
  activeUsers: { daily: number; weekly: number }
  totalSessionsToday: number
  revenueByProvider: Record<string, number>
}

// ── Patch user (PATCH /admin/users/:id) ──────────────────────────────────────

export interface PatchUserInput {
  role?: UserRole
  isActive?: boolean
}

// ── Assign subscription (PUT /admin/users/:id/subscription) ──────────────────

export interface AssignSubscriptionInput {
  plan: PlanId
  durationMonths?: IntervalMonths
  endDate?: string
  paymentProvider?: PaymentProvider
}
