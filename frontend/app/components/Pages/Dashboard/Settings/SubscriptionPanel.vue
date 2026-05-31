<script setup lang="ts">
import { toast } from 'vue-sonner'
import type {
  InitiateFibResult,
  PlanId,
  IntervalMonths,
  UserSubscriptionDetail,
} from '~/common/types/subscription-types'
import { PLAN_META, PLAN_PRICES_IQD, INTERVAL_LABELS } from '~/common/types/subscription-types'
import { useAuthStore } from '~~/stores/auth'

const props = defineProps<{
  subscription: UserSubscriptionDetail | null
}>()

const emit = defineEmits<{ refreshed: [] }>()

const authStore = useAuthStore()
const { initiateFib, cancelFib } = useSubscription()

// ─── Derived state ────────────────────────────────────────────────────────────

const currentPlan   = computed(() => (props.subscription?.plan ?? 'FREE') as PlanId)
const subStatus     = computed(() => props.subscription?.status ?? 'INACTIVE')
const isActive      = computed(() => subStatus.value === 'ACTIVE')
const isFibProvider = computed(() => props.subscription?.paymentProvider === 'FIB')
const isCashProvider= computed(() => props.subscription?.paymentProvider === 'CASH')
const fibSubId      = computed(() => props.subscription?.externalSubscriptionId ?? null)
const periodEnd     = computed(() => props.subscription?.currentPeriodEnd ?? null)

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IQ', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Upgrade form state ───────────────────────────────────────────────────────

const route = useRoute()
const selectedPlan     = ref<'GOLD' | 'PREMIUM'>(
  route.query.plan === 'PREMIUM' ? 'PREMIUM' : 'GOLD',
)
const selectedInterval = ref<IntervalMonths>(1)
const initiating       = ref(false)
const cancelling       = ref(false)
const showCancelConfirm = ref(false)

const paymentModal = ref(false)
const paymentData  = ref<InitiateFibResult | null>(null)

const UPGRADEABLE_PLANS: Array<'GOLD' | 'PREMIUM'> = ['GOLD', 'PREMIUM']
const INTERVALS: IntervalMonths[] = [1, 3, 6, 12]

const selectedPrice = computed(() =>
  PLAN_PRICES_IQD[selectedPlan.value][selectedInterval.value],
)

// Savings badge: compare to 1-month × interval
const savings = computed(() => {
  const monthly = PLAN_PRICES_IQD[selectedPlan.value][1]
  const actual  = PLAN_PRICES_IQD[selectedPlan.value][selectedInterval.value]
  const full    = monthly * selectedInterval.value
  if (full <= actual) return null
  return Math.round(((full - actual) / full) * 100)
})

function fmtIQD(n: number) {
  return n.toLocaleString('en-IQ') + ' IQD'
}

// ─── Actions ─────────────────────────────────────────────────────────────────

async function handleSubscribe() {
  if (initiating.value) return
  initiating.value = true
  const res = await initiateFib(selectedPlan.value, selectedInterval.value)
  initiating.value = false
  if (!res.success) {
    const status = (res as any).status
    if (status === 409) toast.error(res.message || 'You already have an active subscription.')
    else if (status === 503) toast.error('FIB payment is not configured yet. Contact support.')
    else toast.error(res.message || 'Could not initiate payment.')
    return
  }
  paymentData.value = (res.data as any)?.data ?? (res.data as any)
  paymentModal.value = true
}

async function handleCancel() {
  if (!fibSubId.value) {
    toast.error('No active FIB subscription found.')
    return
  }
  cancelling.value = true
  const res = await cancelFib(fibSubId.value)
  cancelling.value = false
  showCancelConfirm.value = false

  if (!res.success) {
    toast.error(res.message || 'Could not cancel subscription.')
    return
  }
  toast.success('Subscription cancelled. You will keep access until the end of your billing period.')
  await authStore.fetchUser()
  emit('refreshed')
}

function handleActivated() {
  paymentModal.value = false
  authStore.fetchUser()
  emit('refreshed')
}

// ─── Styling ──────────────────────────────────────────────────────────────────

const planBadgeStyle = computed(() => {
  if (currentPlan.value === 'PREMIUM')
    return 'background:rgba(245,158,11,0.12);color:var(--color-brand-primary);border:1px solid rgba(245,158,11,0.25)'
  if (currentPlan.value === 'GOLD')
    return 'background:rgba(245,158,11,0.08);color:#f59e0b;border:1px solid rgba(245,158,11,0.2)'
  return 'background:var(--surface-well);color:var(--text-muted);border:1px solid var(--border-inner)'
})
</script>

<template>
  <div class="space-y-5">

    <!-- ── Current plan card ──────────────────────────────────────────────── -->
    <div class="dash-card p-5">
      <!-- Header row -->
      <div class="flex items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-3">
          <div
            class="size-10 rounded-xl flex items-center justify-center shrink-0"
            style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2)"
          >
            <AppIconsax name="Crown1" color="var(--color-brand-primary)" :size="18" />
          </div>
          <div>
            <AppText size="14" weight="semibold" class-list="block" :style="`color:var(--text-heading)`">
              Current plan
            </AppText>
            <AppText size="12" :style="`color:var(--text-muted)`">
              {{ isActive ? 'Active subscription' : 'No active subscription' }}
            </AppText>
          </div>
        </div>
        <span
          class="text-[12px] font-bold uppercase tracking-wide px-3 py-1 rounded-full font-poppins"
          :style="planBadgeStyle"
        >
          {{ PLAN_META[currentPlan].name }}
        </span>
      </div>

      <!-- Features grid -->
      <div class="grid grid-cols-2 gap-2 mb-4">
        <div v-for="feat in PLAN_META[currentPlan].features" :key="feat" class="flex items-center gap-2">
          <AppIconsax name="TickCircle" color="var(--color-brand-primary)" :size="13" />
          <AppText size="12" :style="`color:var(--text-body)`">{{ feat }}</AppText>
        </div>
      </div>

      <!-- Period end + provider info (paid plans) -->
      <template v-if="currentPlan !== 'FREE' && isActive">
        <div style="height:1px;background:var(--border-inner);margin-bottom:1rem" />
        <div class="flex items-center justify-between mb-4">
          <div>
            <AppText size="11" :uppercase="true" class-list="tracking-widest block" :style="`color:var(--text-subtle)`">
              Renews / expires
            </AppText>
            <AppText size="13" weight="semibold" :style="`color:var(--text-heading)`">
              {{ fmtDate(periodEnd) }}
            </AppText>
          </div>
          <div class="text-right">
            <AppText size="11" :uppercase="true" class-list="tracking-widest block" :style="`color:var(--text-subtle)`">
              Provider
            </AppText>
            <AppText size="13" weight="semibold" :style="`color:var(--text-heading)`">
              {{ isCashProvider ? 'Admin (Cash)' : isFibProvider ? 'FIB Bank' : '—' }}
            </AppText>
          </div>
        </div>

        <!-- Cancel — only for FIB (cash is admin-managed) -->
        <template v-if="isFibProvider">
          <div v-if="!showCancelConfirm">
            <AppButton
              variant="secondary" size="32" radius="8"
              icon="CloseCircle" :icon-config="{ color: '#ef4444', size: 13 }"
              text="Cancel subscription"
              style="color:#ef4444"
              @click="showCancelConfirm = true"
            />
          </div>
          <div
            v-else
            class="rounded-xl p-4 space-y-3"
            style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2)"
          >
            <AppText size="13" weight="semibold" :style="`color:var(--text-heading)`">Cancel your subscription?</AppText>
            <AppText size="12" :style="`color:var(--text-muted)`">
              You'll keep access until {{ fmtDate(periodEnd) }}. This cannot be undone.
            </AppText>
            <div class="flex items-center gap-2">
              <AppButton
                variant="secondary" size="32" radius="8"
                text="Keep plan" class="flex-1"
                @click="showCancelConfirm = false"
              />
              <AppButton
                variant="secondary" size="32" radius="8"
                icon="Trash" :icon-config="{ color: '#ef4444', size: 13 }"
                text="Yes, cancel" class="flex-1"
                style="color:#ef4444;border-color:rgba(239,68,68,0.4)"
                :loading="cancelling"
                @click="handleCancel"
              />
            </div>
          </div>
        </template>

        <!-- Cash plan — not self-cancellable -->
        <div
          v-else-if="isCashProvider"
          class="flex items-center gap-2 px-4 py-3 rounded-xl"
          style="background:var(--surface-raised);border:1px solid var(--border-inner)"
        >
          <AppIconsax name="InfoCircle" color="var(--color-text-muted)" :size="14" />
          <AppText size="12" :style="`color:var(--text-muted)`">
            This plan is managed by your admin. Contact support to make changes.
          </AppText>
        </div>
      </template>
    </div>

    <!-- ── Upgrade section ────────────────────────────────────────────────── -->
    <template v-if="currentPlan === 'FREE' || !isActive">
      <div class="dash-card p-5 space-y-5">
        <AppText size="14" weight="semibold" class-list="block" :style="`color:var(--text-heading)`">
          Upgrade your plan
        </AppText>

        <!-- Plan selector -->
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="p in UPGRADEABLE_PLANS"
            :key="p"
            type="button"
            class="relative flex flex-col gap-2 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer"
            :style="selectedPlan === p
              ? 'border-color:var(--color-brand-primary);background:rgba(245,158,11,0.05)'
              : 'border-color:var(--border-card);background:var(--surface-raised)'"
            @click="selectedPlan = p"
          >
            <div class="flex items-center justify-between">
              <AppText
                size="13" weight="semibold"
                :style="selectedPlan === p ? 'color:var(--color-brand-primary)' : 'color:var(--text-heading)'"
              >
                {{ PLAN_META[p].name }}
              </AppText>
              <div
                class="size-4 rounded-full border-2 flex items-center justify-center transition-colors"
                :style="selectedPlan === p ? 'border-color:var(--color-brand-primary)' : 'border-color:var(--text-subtle)'"
              >
                <div v-if="selectedPlan === p" class="size-2 rounded-full" style="background:var(--color-brand-primary)" />
              </div>
            </div>
            <AppText size="11" :style="`color:var(--text-muted)`">{{ PLAN_META[p].model }}</AppText>
            <ul class="space-y-1 mt-1">
              <li v-for="f in PLAN_META[p].features.slice(0, 3)" :key="f" class="flex items-center gap-1.5">
                <AppIconsax
                  name="TickCircle" :size="11"
                  :color="selectedPlan === p ? 'var(--color-brand-primary)' : 'var(--color-text-subtle)'"
                />
                <AppText size="11" :style="`color:var(--text-muted)`">{{ f }}</AppText>
              </li>
            </ul>
          </button>
        </div>

        <!-- Interval selector -->
        <div>
          <AppText size="12" weight="semibold" class-list="block mb-2" :style="`color:var(--text-body)`">
            Billing period
          </AppText>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="m in INTERVALS"
              :key="m"
              type="button"
              class="relative py-2 rounded-xl text-[12px] font-semibold font-poppins border text-center transition-all duration-200 cursor-pointer"
              :style="selectedInterval === m
                ? 'border-color:var(--color-brand-primary);background:rgba(245,158,11,0.07);color:var(--color-brand-primary)'
                : 'border-color:var(--border-card);background:var(--surface-raised);color:var(--text-muted)'"
              @click="selectedInterval = m"
            >
              {{ m }}mo
              <!-- savings badge -->
              <span
                v-if="m > 1 && PLAN_PRICES_IQD[selectedPlan][1] * m > PLAN_PRICES_IQD[selectedPlan][m]"
                class="absolute -top-2 -right-1 text-[9px] font-bold px-1 rounded-full"
                style="background:var(--color-brand-primary);color:white"
              >
                -{{ Math.round(((PLAN_PRICES_IQD[selectedPlan][1] * m - PLAN_PRICES_IQD[selectedPlan][m]) / (PLAN_PRICES_IQD[selectedPlan][1] * m)) * 100) }}%
              </span>
            </button>
          </div>
        </div>

        <!-- Price display -->
        <div
          class="flex items-center justify-between px-4 py-3 rounded-xl"
          style="background:var(--surface-raised);border:1px solid var(--border-inner)"
        >
          <div>
            <AppText size="11" :uppercase="true" class-list="tracking-[0.12em] block" :style="`color:var(--text-subtle)`">
              Total
            </AppText>
            <AppText size="20" weight="bold" :style="`color:var(--text-heading)`">
              {{ fmtIQD(selectedPrice) }}
            </AppText>
          </div>
          <div class="text-right">
            <AppText size="12" weight="medium" :style="`color:var(--text-muted)`">
              {{ INTERVAL_LABELS[selectedInterval] }}
            </AppText>
            <AppText size="11" :style="`color:var(--text-subtle)`">via FIB Bank</AppText>
          </div>
        </div>

        <!-- CTA -->
        <AppButton
          variant="primary" size="40" radius="12"
          icon="Wallet2" :icon-config="{ color: 'white', size: 15 }"
          :text="initiating ? 'Preparing payment…' : `Subscribe to ${PLAN_META[selectedPlan].name}`"
          class="w-full justify-center"
          :loading="initiating"
          @click="handleSubscribe"
        />

        <AppText size="11" class-list="text-center block" :style="`color:var(--text-subtle)`">
          Paid securely via FIB Bank · IQD only · Cancel anytime
        </AppText>
      </div>
    </template>

    <!-- ── FIB Payment modal ───────────────────────────────────────────────── -->
    <PagesDashboardSettingsFibPaymentModal
      :open="paymentModal"
      :payment="paymentData"
      :plan="selectedPlan"
      :interval-months="selectedInterval"
      :amount-i-q-d="selectedPrice"
      @update:open="paymentModal = $event"
      @activated="handleActivated"
    />

  </div>
</template>
