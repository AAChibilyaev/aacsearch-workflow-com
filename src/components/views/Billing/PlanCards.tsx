'use client'

import React from 'react'

import type { EntitlementValue, Formatters, Plan } from './shared'

import { intervalSuffix, t, trialLabel } from './i18n'
import {
  cardStyle,
  humanizeToken,
  mutedStyle,
  primaryButtonStyle,
  sectionHeadingStyle,
  StatusPill,
} from './shared'

type Props = {
  busyCode: null | string
  canManage: boolean
  currentPlanCode: null | string
  fmt: Formatters
  lang: string
  onSubscribe: (planCode: string) => void
  plans: null | Plan[]
}

const MAX_BULLETS = 6

const formatEntitlement = (lang: string, value: EntitlementValue, fmt: Formatters): string => {
  if (typeof value === 'boolean') return value ? t(lang, 'included') : '—'
  if (typeof value === 'number') return fmt.number(value)
  return value
}

/** Tariff cards — price, trial, entitlement bullets and a subscribe action. */
export const PlanCards: React.FC<Props> = ({
  busyCode,
  canManage,
  currentPlanCode,
  fmt,
  lang,
  onSubscribe,
  plans,
}) => {
  return (
    <div style={cardStyle}>
      <h3 style={sectionHeadingStyle}>{t(lang, 'plansTitle')}</h3>

      {plans === null ? (
        <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'plansEmpty')}</p>
      ) : plans.length === 0 ? (
        <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'plansEmpty')}</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 'calc(var(--base, 20px) * 0.6)',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          }}
        >
          {plans.map((plan) => {
            const isCurrent = currentPlanCode !== null && plan.code === currentPlanCode
            const bullets = Object.entries(plan.entitlements ?? {}).slice(0, MAX_BULLETS)
            const busy = busyCode === plan.code
            const disabled = busyCode !== null
            return (
              <div
                key={plan.code}
                style={{
                  background: 'var(--theme-elevation-0, transparent)',
                  border: isCurrent
                    ? '1px solid var(--theme-success-400, #6cc48a)'
                    : '1px solid var(--theme-elevation-100, #e3e3e3)',
                  borderRadius: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  padding: 'calc(var(--base, 20px) * 0.7)',
                }}
              >
                <div
                  style={{
                    alignItems: 'flex-start',
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{plan.name || plan.code}</div>
                  {isCurrent && (
                    <StatusPill label={t(lang, 'currentPlan')} tone="success" />
                  )}
                </div>

                <div style={{ alignItems: 'baseline', display: 'flex', gap: '0.25rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {plan.amountCents === 0
                      ? t(lang, 'planFree')
                      : fmt.money(plan.amountCents, plan.currency)}
                  </span>
                  {plan.amountCents > 0 && (
                    <span style={{ ...mutedStyle, fontSize: '0.85rem' }}>
                      {intervalSuffix(lang, plan.interval)}
                    </span>
                  )}
                </div>

                {typeof plan.trialPeriodDays === 'number' && plan.trialPeriodDays > 0 && (
                  <div style={{ color: 'var(--theme-success-700, #1e7a45)', fontSize: '0.8rem' }}>
                    {trialLabel(lang, plan.trialPeriodDays)}
                  </div>
                )}

                {plan.description && (
                  <p style={{ ...mutedStyle, fontSize: '0.85rem', margin: 0 }}>{plan.description}</p>
                )}

                {bullets.length > 0 && (
                  <ul
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {bullets.map(([key, value]) => (
                      <li
                        key={key}
                        style={{ display: 'flex', fontSize: '0.85rem', gap: '0.5rem' }}
                      >
                        <span aria-hidden="true" style={{ color: 'var(--theme-success-600, #2f9256)' }}>
                          ✓
                        </span>
                        <span>
                          {humanizeToken(key)}
                          {typeof value === 'boolean'
                            ? ''
                            : `: ${formatEntitlement(lang, value, fmt)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '0.4rem' }}>
                  {isCurrent ? (
                    <StatusPill label={t(lang, 'currentPlan')} tone="neutral" />
                  ) : canManage ? (
                    <button
                      disabled={disabled}
                      onClick={() => onSubscribe(plan.code)}
                      style={{
                        ...primaryButtonStyle,
                        opacity: disabled && !busy ? 0.6 : 1,
                        width: '100%',
                      }}
                      type="button"
                    >
                      {busy
                        ? t(lang, 'loading')
                        : currentPlanCode
                          ? t(lang, 'upgradePlan')
                          : t(lang, 'choosePlan')}
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
