import type {
  InitiateFibResult,
  FibStatusResult,
  UserSubscriptionDetail,
  PlanId,
  IntervalMonths,
} from '~/common/types/subscription-types'

interface SingleResponse<T> { success: boolean; message?: string; data: T }

export function useSubscription() {

  async function getMySubscription() {
    return await useHttp<SingleResponse<UserSubscriptionDetail>>({
      method: 'GET',
      url: '/users/me/subscription',
      requireAuth: true,
    })
  }

  async function initiateFib(plan: 'GOLD' | 'PREMIUM', intervalMonths: IntervalMonths) {
    return await useHttp<SingleResponse<InitiateFibResult>>({
      method: 'POST',
      url: '/subscriptions/initiate-fib',
      body: { plan, intervalMonths },
      requireAuth: true,
    })
  }

  async function getFibStatus(subscriptionId: string) {
    return await useHttp<SingleResponse<FibStatusResult>>({
      method: 'GET',
      url: `/subscriptions/fib/${subscriptionId}/status`,
      requireAuth: true,
    })
  }

  async function cancelFib(subscriptionId: string) {
    return await useHttp({
      method: 'DELETE',
      url: `/subscriptions/fib/${subscriptionId}`,
      requireAuth: true,
    })
  }

  return { getMySubscription, initiateFib, getFibStatus, cancelFib }
}
