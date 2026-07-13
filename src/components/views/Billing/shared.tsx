import React from 'react'

import { Badge } from '@/components/ui/badge'

/**
 * Shared building blocks for the Billing view — response types (mirroring the
 * white-label /api/billing/* contract), theme-aware style tokens, locale-aware
 * formatters and a couple of tiny presentational primitives (status pill,
 * progress bar) reused across the sub-panels. No vendor identifiers anywhere.
 */

// ---------------------------------------------------------------------------
// Contract types — the exact white-label shapes returned by /api/billing/*
// ---------------------------------------------------------------------------

export type EntitlementValue = boolean | number | string
export type Entitlements = Record<string, EntitlementValue>

export type BillingStatus =
  | 'active'
  | 'canceled'
  | 'none'
  | 'past_due'
  | 'suspended'
  | 'trialing'

export type BillingUsageItem = {
  amountCents: number
  code: string
  name: string
  units: number
}

export type BillingUsage = {
  currency: string
  fromDate: string
  items: BillingUsageItem[]
  toDate: string
  totalCents: number
}

/** GET /api/billing/summary?tenant=ID */
export type BillingSummary = {
  entitlements: Entitlements
  plan: { code: string; name: string } | null
  status: BillingStatus
  trialEndsAt: null | string
  usage: BillingUsage | null
}

export type PlanCharge = {
  code: string
  name: string
  pricingType: string
  unit: string
}

/** GET /api/billing/plans -> { plans: Plan[] } */
export type Plan = {
  amountCents: number
  charges?: PlanCharge[]
  code: string
  currency: string
  description: string
  entitlements: Entitlements
  interval: string
  name: string
  trialPeriodDays?: null | number
}

/** GET /api/billing/wallet -> { wallet: Wallet | null } */
export type Wallet = {
  balanceCents: number
  creditsBalance: number
  currency: string
  name: string
  status: string
}

/** GET /api/billing/wallet/transactions -> { transactions: WalletTransaction[] } */
export type WalletTransaction = {
  amountCents: number
  createdAt: string
  credits: number
  id: string
  settledAt: null | string
  status: string
  type: string
}

/** GET /api/billing/invoices -> { invoices: Invoice[] } */
export type Invoice = {
  currency: string
  /** absolute-or-relative link to our PDF proxy (never a vendor URL) */
  downloadUrl?: null | string
  id: string
  /** current DTO field; superseded by `issuingDate` in the shared contract */
  issuedAt?: null | string
  issuingDate?: null | string
  number: string
  paymentStatus: string
  status: string
  totalCents: number
}

// ---------------------------------------------------------------------------
// Style tokens (match the sibling Integrations / Billing panels)
// ---------------------------------------------------------------------------

export const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  padding: 'calc(var(--base, 20px) * 0.9)',
}

export const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }

export const primaryButtonStyle: React.CSSProperties = {
  background: 'var(--theme-success-500, #3faf68)',
  border: '1px solid var(--theme-success-600, #2f9256)',
  borderRadius: 4,
  color: '#fff',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 600,
  padding: '0.4rem 0.9rem',
}

export const neutralButtonStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-100, #ededed)',
  border: '1px solid var(--theme-elevation-150, #ccc)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: '0.4rem 0.9rem',
}

export const dangerButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--theme-error-250, #e0a3a3)',
  borderRadius: 4,
  color: 'var(--theme-error-750, #8f1f1f)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: '0.4rem 0.9rem',
}

export const inputStyle: React.CSSProperties = {
  background: 'var(--theme-input-bg, var(--theme-elevation-0, #fff))',
  border: '1px solid var(--theme-elevation-150, #ccc)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  padding: '0.45rem 0.6rem',
}

export const sectionHeadingStyle: React.CSSProperties = { margin: '0 0 0.6rem' }

// ---------------------------------------------------------------------------
// Locale-aware formatters
// ---------------------------------------------------------------------------

export type Formatters = {
  date: (value: string) => string
  dateTime: (value: string) => string
  money: (cents: number, currency: string) => string
  number: (value: number) => string
}

export const createFormatters = (lang: string): Formatters => ({
  date: (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    try {
      return date.toLocaleDateString(lang)
    } catch {
      return date.toISOString().slice(0, 10)
    }
  },
  dateTime: (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    try {
      return date.toLocaleString(lang)
    } catch {
      return date.toISOString()
    }
  },
  money: (cents, currency) => {
    try {
      return new Intl.NumberFormat(lang, { currency, style: 'currency' }).format(cents / 100)
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency}`
    }
  },
  number: (value) => {
    try {
      return new Intl.NumberFormat(lang).format(value)
    } catch {
      return String(value)
    }
  },
})

// ---------------------------------------------------------------------------
// Status pill (single source of truth for coloured status badges)
// ---------------------------------------------------------------------------

export type Tone = 'error' | 'neutral' | 'success' | 'warning'

const TONE_STYLE: Record<Tone, { bg: string; fg: string }> = {
  error: { bg: 'var(--theme-error-100, #fbe9e9)', fg: 'var(--theme-error-750, #8f1f1f)' },
  neutral: { bg: 'var(--theme-elevation-100, #ededed)', fg: 'var(--theme-elevation-700, #444)' },
  success: { bg: 'var(--theme-success-100, #e2f4e8)', fg: 'var(--theme-success-750, #14713d)' },
  warning: { bg: 'var(--theme-warning-100, #fbf1df)', fg: 'var(--theme-warning-750, #8a5b0b)' },
}

export const StatusPill: React.FC<{ label: string; tone?: Tone }> = ({ label, tone = 'neutral' }) => {
  const colors = TONE_STYLE[tone]
  return (
    <Badge
      style={{
        alignItems: 'center',
        background: colors.bg,
        border: 'none',
        borderRadius: 999,
        color: colors.fg,
        display: 'inline-flex',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1,
        padding: '0.4em 0.9em',
      }}
    >
      {label}
    </Badge>
  )
}

export const toneForBillingStatus = (status: BillingStatus): Tone => {
  switch (status) {
    case 'active':
      return 'success'
    case 'canceled':
    case 'suspended':
      return 'error'
    case 'past_due':
      return 'warning'
    default:
      return 'neutral'
  }
}

/** Generic status colouring for wallet / payment / invoice states. */
export const toneForGenericStatus = (status: string): Tone => {
  const normalized = status.toLowerCase()
  if (['active', 'paid', 'settled', 'succeeded', 'valid'].includes(normalized)) return 'success'
  if (['error', 'failed', 'overdue', 'past_due', 'terminated', 'voided'].includes(normalized)) {
    return 'error'
  }
  if (['pending', 'processing', 'draft'].includes(normalized)) return 'warning'
  return 'neutral'
}

/** Title-case an arbitrary backend status/type token for neutral display. */
export const humanizeToken = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

export const Progress: React.FC<{ pct: number }> = ({ pct }) => {
  const clamped = Math.max(0, Math.min(100, pct))
  const color =
    clamped >= 100
      ? 'var(--theme-error-500, #d93030)'
      : clamped >= 80
        ? 'var(--theme-warning-500, #f5a623)'
        : 'var(--theme-success-500, #3faf68)'
  return (
    <div
      style={{
        background: 'var(--theme-elevation-100, #ededed)',
        borderRadius: 999,
        height: 6,
        minWidth: 120,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div style={{ background: color, borderRadius: 999, height: '100%', width: `${clamped}%` }} />
    </div>
  )
}
