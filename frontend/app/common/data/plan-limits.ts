import type { User } from '~/common/model/user'

export type Plan = User['subscription']['plan']

export interface PlanLimits {
  sessionsPerDay: number
  messagesPerSessionSoft: number
  messagesPerSessionHard: number
  messagesPerDayHard: number | null
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    sessionsPerDay: 3,
    messagesPerSessionSoft: 50,
    messagesPerSessionHard: 60,
    messagesPerDayHard: 20,
  },
  GOLD: {
    sessionsPerDay: 15,
    messagesPerSessionSoft: 100,
    messagesPerSessionHard: 110,
    messagesPerDayHard: null,
  },
  PREMIUM: {
    sessionsPerDay: 50,
    messagesPerSessionSoft: 150,
    messagesPerSessionHard: 160,
    messagesPerDayHard: null,
  },
}

export function getLimits(plan: Plan | undefined | null): PlanLimits {
  return PLAN_LIMITS[plan ?? 'FREE']
}
