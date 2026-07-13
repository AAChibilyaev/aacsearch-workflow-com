'use client'

import React from 'react'

import type { Formatters, Wallet, WalletTransaction } from './shared'

import { t } from './i18n'
import {
  cardStyle,
  humanizeToken,
  inputStyle,
  mutedStyle,
  neutralButtonStyle,
  primaryButtonStyle,
  sectionHeadingStyle,
  StatusPill,
  toneForGenericStatus,
} from './shared'

type Props = {
  busy: boolean
  canManage: boolean
  fmt: Formatters
  lang: string
  onTopup: (amountCents: number) => void
  transactions: null | WalletTransaction[]
  wallet: null | Wallet
}

const txnTypeLabel = (lang: string, type: string): string => {
  const n = type.toLowerCase()
  if (['credit', 'inbound', 'purchased', 'top_up', 'topup'].includes(n)) return t(lang, 'txnCredit')
  if (['charge', 'consumed', 'debit', 'outbound'].includes(n)) return t(lang, 'txnDebit')
  if (['bonus', 'free', 'granted'].includes(n)) return t(lang, 'txnBonus')
  return humanizeToken(type)
}

/** Wallet balance + credits, a top-up form and the wallet activity table. */
export const WalletCard: React.FC<Props> = ({
  busy,
  canManage,
  fmt,
  lang,
  onTopup,
  transactions,
  wallet,
}) => {
  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState('')
  const [localError, setLocalError] = React.useState<null | string>(null)

  const currency = wallet?.currency ?? 'USD'

  const submit = (): void => {
    const value = Number.parseFloat(amount.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      setLocalError(t(lang, 'invalidAmount'))
      return
    }
    setLocalError(null)
    onTopup(Math.round(value * 100))
    setOpen(false)
    setAmount('')
  }

  if (!wallet) {
    return (
      <div style={cardStyle}>
        <h3 style={sectionHeadingStyle}>{t(lang, 'walletTitle')}</h3>
        <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'walletEmpty')}</p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <h3 style={{ margin: 0 }}>{t(lang, 'walletTitle')}</h3>
        {wallet.status && (
          <StatusPill
            label={humanizeToken(wallet.status)}
            tone={toneForGenericStatus(wallet.status)}
          />
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'calc(var(--base, 20px) * 1)',
          marginBottom: canManage ? '0.9rem' : 0,
        }}
      >
        <div>
          <div style={{ ...mutedStyle, fontSize: '0.8rem' }}>{t(lang, 'walletBalance')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {fmt.money(wallet.balanceCents, currency)}
          </div>
        </div>
        <div>
          <div style={{ ...mutedStyle, fontSize: '0.8rem' }}>{t(lang, 'walletCredits')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {fmt.number(wallet.creditsBalance)}
          </div>
        </div>
      </div>

      {canManage && (
        <div>
          {open ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <input
                aria-label={t(lang, 'amountLabel')}
                min="0"
                onChange={(event) => setAmount(event.target.value)}
                placeholder={t(lang, 'amountLabel')}
                step="0.01"
                style={{ ...inputStyle, maxWidth: 160, width: '100%' }}
                type="number"
                value={amount}
              />
              <button
                disabled={busy}
                onClick={submit}
                style={{ ...primaryButtonStyle, opacity: busy ? 0.6 : 1 }}
                type="button"
              >
                {busy ? t(lang, 'loading') : t(lang, 'addFunds')}
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setOpen(false)
                  setAmount('')
                  setLocalError(null)
                }}
                style={neutralButtonStyle}
                type="button"
              >
                {t(lang, 'cancelAction')}
              </button>
            </div>
          ) : (
            <button onClick={() => setOpen(true)} style={neutralButtonStyle} type="button">
              {t(lang, 'topUp')}
            </button>
          )}
          {localError && (
            <p style={{ color: 'var(--theme-error-750, #8f1f1f)', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
              {localError}
            </p>
          )}
        </div>
      )}

      {/* Wallet activity */}
      <div style={{ marginTop: 'calc(var(--base, 20px) * 0.9)' }}>
        <h4 style={{ margin: '0 0 0.5rem' }}>{t(lang, 'transactionsTitle')}</h4>
        {!transactions || transactions.length === 0 ? (
          <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'transactionsEmpty')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: 560, width: '100%' }}>
              <thead>
                <tr>
                  {[
                    t(lang, 'colDate'),
                    t(lang, 'colType'),
                    t(lang, 'colStatus'),
                    t(lang, 'colAmount'),
                    t(lang, 'colCredits'),
                  ].map((heading, index) => (
                    <th
                      key={index}
                      style={{
                        ...mutedStyle,
                        borderBottom: '1px solid var(--theme-elevation-100, #e3e3e3)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        padding: '0.4rem 0.75rem 0.4rem 0',
                        textAlign: 'left',
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', whiteSpace: 'nowrap' }}>
                      {fmt.dateTime(txn.createdAt)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem 0.5rem 0' }}>
                      {txnTypeLabel(lang, txn.type)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem 0.5rem 0' }}>
                      <StatusPill
                        label={humanizeToken(txn.status)}
                        tone={toneForGenericStatus(txn.status)}
                      />
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', whiteSpace: 'nowrap' }}>
                      {fmt.money(txn.amountCents, currency)}
                    </td>
                    <td style={{ padding: '0.5rem 0 0.5rem 0', whiteSpace: 'nowrap' }}>
                      {fmt.number(txn.credits)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
