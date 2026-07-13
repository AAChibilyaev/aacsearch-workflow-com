import type {
  CustomerUsageObject,
  PlanEntitlement,
  PlanEntitlementObject,
  PlanObject,
  SubscriptionEntitlementObject,
} from 'lago-javascript-client'

/**
 * Pure mappers from billing-backend response objects to the AACSearch
 * customer-facing DTOs. WHITE-LABEL CONTRACT: no vendor identifier
 * (lago_* ids, provider names, backend URLs) may ever survive a mapping —
 * every DTO is built field-by-field from scratch, never spread.
 */

export type EntitlementsRecord = Record<string, boolean | number | string>

export type BillingStatus = 'active' | 'canceled' | 'none' | 'past_due' | 'suspended' | 'trialing'

export const BILLING_STATUSES: readonly BillingStatus[] = [
  'none',
  'trialing',
  'active',
  'past_due',
  'suspended',
  'canceled',
]

export type PlanDTO = {
  amountCents: number
  code: string
  currency: string
  description: string
  entitlements: EntitlementsRecord
  interval: string
  name: string
}

export type PlansDTO = { plans: PlanDTO[] }

export type UsageItemDTO = {
  amountCents: number
  code: string
  name: string
  units: number
}

export type UsageDTO = {
  currency: string
  fromDate: string
  items: UsageItemDTO[]
  toDate: string
  totalCents: number
}

export type BillingSummaryDTO = {
  entitlements: EntitlementsRecord
  plan: { code: string; name: string } | null
  status: BillingStatus
  trialEndsAt: null | string
  usage: null | UsageDTO
}

/** Shape of the `billing` group mirrored on the tenant document. */
export type TenantBillingMirror = {
  entitlements?: unknown
  plan?: null | string
  planName?: null | string
  status?: null | string
  syncedAt?: null | string
  trialEndsAt?: null | string
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isEntitlementValue = (value: unknown): value is boolean | number | string =>
  typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string'

/** Narrow an arbitrary json value (e.g. the tenant mirror field) to a clean record. */
export const sanitizeEntitlements = (value: unknown): EntitlementsRecord => {
  if (!isPlainRecord(value)) return {}
  const out: EntitlementsRecord = {}
  for (const [key, val] of Object.entries(value)) {
    if (isEntitlementValue(val)) out[key] = val
  }
  return out
}

type AnyEntitlementLike =
  | PlanEntitlement
  | PlanEntitlementObject
  | SubscriptionEntitlementObject
  | { entitlement?: unknown }
  | null
  | undefined

/**
 * Flattens billing-backend feature entitlements into a flat
 * Record<privilegeCode, value>. Privilege codes are treated as globally
 * unique (define them namespaced in the billing backend, e.g.
 * `max_documents`, `ai_search`); if two features reuse a code the last
 * one wins. Accepts both wrapped (`{ entitlement: {...} }`) and unwrapped
 * feature objects so plan and subscription responses map identically.
 */
export const flattenEntitlements = (entitlements: unknown): EntitlementsRecord => {
  const out: EntitlementsRecord = {}
  if (!Array.isArray(entitlements)) return out

  for (const entry of entitlements as AnyEntitlementLike[]) {
    if (!isPlainRecord(entry)) continue
    const feature = isPlainRecord(entry.entitlement) ? entry.entitlement : entry
    const privileges = (feature as { privileges?: unknown }).privileges
    if (!Array.isArray(privileges)) continue
    for (const privilege of privileges) {
      if (!isPlainRecord(privilege)) continue
      const code = privilege.code
      const value = privilege.value
      if (typeof code === 'string' && code.length > 0 && isEntitlementValue(value)) {
        out[code] = value
      }
    }
  }

  return out
}

/**
 * Map a billing-backend plan object to the public PlanDTO.
 * Entitlements resolved separately (list responses may omit them) win over
 * whatever is inlined on the plan object.
 */
export const toPlanDTO = (plan: PlanObject, entitlements?: EntitlementsRecord): PlanDTO => ({
  amountCents: plan.amount_cents,
  code: plan.code,
  currency: plan.amount_currency,
  description: plan.description ?? '',
  entitlements: entitlements ?? flattenEntitlements(plan.entitlements),
  interval: plan.interval,
  name: plan.name,
})

export const toPlansDTO = (plans: PlanDTO[]): PlansDTO => ({ plans })

/** Map the billing backend's current-usage object to the public UsageDTO. */
export const toUsageDTO = (usage: CustomerUsageObject): UsageDTO => ({
  currency: usage.currency ?? 'USD',
  fromDate: usage.from_datetime,
  items: (usage.charges_usage ?? []).map((charge) => ({
    amountCents: charge.amount_cents,
    code: charge.billable_metric.code,
    name: charge.billable_metric.name,
    units: Number(charge.units) || 0,
  })),
  toDate: usage.to_datetime,
  totalCents: usage.total_amount_cents,
})

export const normalizeBillingStatus = (value: unknown): BillingStatus =>
  typeof value === 'string' && (BILLING_STATUSES as string[]).includes(value)
    ? (value as BillingStatus)
    : 'none'

/**
 * Build the billing summary from the tenant's mirrored billing state plus
 * (optionally) live usage. The mirror — not the billing backend — is the
 * source for plan/status so the endpoint stays fast and works offline.
 */
export const toBillingSummaryDTO = (
  mirror: TenantBillingMirror | null | undefined,
  usage: null | UsageDTO,
): BillingSummaryDTO => {
  const status = normalizeBillingStatus(mirror?.status)
  const planCode = typeof mirror?.plan === 'string' && mirror.plan.length > 0 ? mirror.plan : null

  return {
    entitlements: sanitizeEntitlements(mirror?.entitlements),
    plan: planCode ? { code: planCode, name: mirror?.planName || planCode } : null,
    status,
    trialEndsAt: typeof mirror?.trialEndsAt === 'string' ? mirror.trialEndsAt : null,
    usage,
  }
}
