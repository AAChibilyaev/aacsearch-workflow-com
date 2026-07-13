'use client'

import React from 'react'

import type { BillingMessageKey } from './i18n'
import type { BillingStatus, BillingSummary, Formatters } from './shared'

import { t } from './i18n'
import {
  cardStyle,
  dangerButtonStyle,
  mutedStyle,
  StatusPill,
  toneForBillingStatus,
} from './shared'

const STATUS_KEY: Record<BillingStatus, BillingMessageKey> = {
  active: 'statusActive',
  canceled: 'statusCanceled',
  none: 'statusNone',
  past_due: 'statusPastDue',
  suspended: 'statusSuspended',
  trialing: 'statusTrialing',
}

type Props = {
  busy: boolean
  canManage: boolean
  fmt: Formatters
  lang: string
  onCancel: () => void
  summary: BillingSummary
}

/** Current subscription state: plan name, status, trial end and a cancel action. */
export const SubscriptionCard: React.FC<Props> = ({
  busy,
  canManage,
  fmt,
  lang,
  onCancel,
  summary,
}) => {
  const noSubscription = summary.plan === null || summary.status === 'none'
  const status = summary.status
  const cancelable = canManage && !noSubscription && status !== 'canceled'

  return (
    <div style={cardStyle}>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ ...mutedStyle, fontSize: '0.85rem' }}>
            {noSubscription ? t(lang, 'subscriptionTitle') : t(lang, 'currentPlan')}
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>
            {noSubscription ? '—' : (summary.plan?.name ?? summary.plan?.code)}
          </div>
        </div>
        <StatusPill label={t(lang, STATUS_KEY[status])} tone={toneForBillingStatus(status)} />
      </div>

      {noSubscription && (
        <p style={{ ...mutedStyle, margin: '0.6rem 0 0' }}>{t(lang, 'noSubscriptionHint')}</p>
      )}

      {status === 'trialing' && summary.trialEndsAt && (
        <p style={{ ...mutedStyle, margin: '0.6rem 0 0' }}>
          {t(lang, 'trialEnds')}: {fmt.date(summary.trialEndsAt)}
        </p>
      )}

      {cancelable && (
        <div style={{ marginTop: '0.9rem' }}>
          <button
            disabled={busy}
            onClick={onCancel}
            style={{ ...dangerButtonStyle, opacity: busy ? 0.6 : 1 }}
            type="button"
          >
            {t(lang, 'cancelPlan')}
          </button>
        </div>
      )}
    </div>
  )
}
