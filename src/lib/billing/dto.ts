import type {
  ChargeObject,
  CustomerUsageObject,
  PlanEntitlement,
  PlanEntitlementObject,
  PlanObject,
  SubscriptionEntitlementObject,
  WalletObject,
  WalletTransactionObject,
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

/**
 * A usage-based charge attached to a plan, white-label. Only customer-safe,
 * self-descriptive fields — never the billing backend's charge/metric ids.
 *  - `unit`   : the billable-metric code being metered (e.g. `search_requests`)
 *  - `pricingType`: the neutral pricing model (`standard` | `package` | ...)
 */
export type PlanChargeDTO = {
  code: string
  name: string
  pricingType: string
  unit: string
}

export type PlanDTO = {
  amountCents: number
  charges: PlanChargeDTO[]
  code: string
  currency: string
  description: string
  entitlements: EntitlementsRecord
  interval: string
  name: string
  trialPeriodDays: number
}

export type PlansDTO = { plans: PlanDTO[] }

/** Prepaid wallet snapshot — no backend ids, provider names or URLs. */
export type WalletDTO = {
  balanceCents: number
  creditsBalance: number
  currency: string
  name: string
  status: string
}

export type WalletBalanceDTO = { wallet: null | WalletDTO }

/** A single wallet ledger entry (top-up, grant, consumption), white-label. */
export type WalletTransactionDTO = {
  amountCents: number
  createdAt: string
  credits: number
  id: string
  settledAt: null | string
  status: string
  type: string
}

export type WalletTransactionsDTO = { transactions: WalletTransactionDTO[] }

/**
 * Result of a payment-initiating action (wallet top-up / subscribe). When the
 * customer must complete payment on the provider's hosted page, `checkoutUrl`
 * carries the provider (Stripe) URL — the payment surface, never the billing
 * vendor's domain.
 */
export type CheckoutDTO = { checkoutUrl: string }

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

export type InvoiceDTO = {
  currency: string
  /** OUR proxy endpoint (`/api/billing/invoices/:id/download`) — never a vendor URL. */
  downloadUrl: string
  id: string
  /** Retained for existing consumers; identical to `issuingDate`. */
  issuedAt: null | string
  issuingDate: null | string
  number: string
  paymentStatus: string
  status: string
  totalCents: number
}

export type InvoicesDTO = { invoices: InvoiceDTO[] }

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
 * Map a billing-backend usage charge to a white-label PlanChargeDTO. Only the
 * self-descriptive, customer-safe fields survive — the backend `lago_id` /
 * `lago_billable_metric_id` are dropped by building the object field-by-field.
 */
export const toPlanChargeDTO = (charge: ChargeObject): PlanChargeDTO => ({
  code: charge.code || charge.billable_metric_code,
  name: charge.invoice_display_name || charge.billable_metric_code,
  pricingType: charge.charge_model,
  unit: charge.billable_metric_code,
})

/**
 * Map a billing-backend plan object to the public PlanDTO.
 * Entitlements resolved separately (list responses may omit them) win over
 * whatever is inlined on the plan object.
 */
export const toPlanDTO = (plan: PlanObject, entitlements?: EntitlementsRecord): PlanDTO => ({
  amountCents: plan.amount_cents,
  charges: (plan.charges ?? []).map(toPlanChargeDTO),
  code: plan.code,
  currency: plan.amount_currency,
  description: plan.description ?? '',
  entitlements: entitlements ?? flattenEntitlements(plan.entitlements),
  interval: plan.interval,
  name: plan.name,
  trialPeriodDays: plan.trial_period ?? 0,
})

/**
 * Map a prepaid wallet to the public WalletDTO. Credits are numeric in the DTO
 * (the backend returns them as decimal strings). No wallet/customer ids leak.
 */
export const toWalletDTO = (wallet: WalletObject): WalletDTO => ({
  balanceCents: wallet.balance_cents ?? wallet.ongoing_balance_cents ?? 0,
  creditsBalance: Number(wallet.credits_balance) || 0,
  currency: wallet.currency ?? 'USD',
  name: wallet.name ?? '',
  status: wallet.status ?? 'active',
})

/**
 * Map a wallet ledger entry to the public WalletTransactionDTO. `amount` is the
 * monetary value expressed in the wallet currency (decimal string) — converted
 * to integer cents here. `id` is the backend's opaque uuid (carries no vendor
 * name); every other backend field (`lago_wallet_id`, invoice ids, ...) drops.
 */
export const toWalletTransactionDTO = (tx: WalletTransactionObject): WalletTransactionDTO => ({
  amountCents: Math.round((Number(tx.amount) || 0) * 100),
  createdAt: tx.created_at,
  credits: Number(tx.credit_amount) || 0,
  id: tx.lago_id,
  settledAt: tx.settled_at ?? null,
  status: tx.status ?? 'pending',
  type: tx.transaction_type ?? 'inbound',
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

/**
 * Map a billing-backend invoice to a white-label DTO. Only the customer-safe
 * fields are copied — no `lago_id`, `external_customer_id`, or vendor URLs —
 * so the invoices list can never leak the billing provider.
 *
 * `downloadUrl` points at OUR proxy endpoint (never the backend `file_url`).
 * It is built only when `tenant` is supplied and an id could be derived.
 */
export const toInvoiceDTO = (
  invoice: {
    currency?: null | string
    invoice_type?: null | string
    issuing_date?: null | string
    number?: null | string
    payment_status?: null | string
    sequential_id?: null | number | string
    status?: null | string
    total_amount_cents?: null | number
  },
  tenant?: null | number | string,
): InvoiceDTO => {
  const id = String(invoice.sequential_id ?? invoice.number ?? '')
  const downloadUrl =
    id.length > 0 && tenant !== undefined && tenant !== null && String(tenant).length > 0
      ? `/api/billing/invoices/${encodeURIComponent(id)}/download?tenant=${encodeURIComponent(String(tenant))}`
      : ''
  return {
    currency: invoice.currency ?? 'USD',
    downloadUrl,
    id,
    issuedAt: invoice.issuing_date ?? null,
    issuingDate: invoice.issuing_date ?? null,
    number: invoice.number ?? '',
    paymentStatus: invoice.payment_status ?? 'pending',
    status: invoice.status ?? 'finalized',
    totalCents: invoice.total_amount_cents ?? 0,
  }
}

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
