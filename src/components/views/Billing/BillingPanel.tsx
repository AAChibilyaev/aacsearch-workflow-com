'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import type {
  BillingSummary,
  Invoice,
  Plan,
  Wallet,
  WalletTransaction,
} from './shared'

import { t } from './i18n'
import { InvoicesTable } from './InvoicesTable'
import { PlanCards } from './PlanCards'
import {
  cardStyle,
  createFormatters,
  inputStyle,
  mutedStyle,
  neutralButtonStyle,
} from './shared'
import { SubscriptionCard } from './SubscriptionCard'
import { UsageMeters } from './UsageMeters'
import { WalletCard } from './WalletCard'

export type TenantOption = { id: string; label: string }

type Props = {
  /** tenant ids the current user may manage billing for (tenant-admin); ignored for super-admins */
  adminTenantIds: string[]
  initialTenantId: null | string
  lang: string
  superAdmin: boolean
  tenantOptions: TenantOption[]
}

/** Latest load, stamped with the request it belongs to — loading is derived
 * (stamp mismatch) rather than reset in the effect. Summary is required; the
 * secondary resources degrade to `null` (neutral empty states) on failure. */
type LoadResult =
  | {
      invoices: Invoice[] | null
      kind: 'ready'
      plans: Plan[] | null
      stamp: string
      summary: BillingSummary
      transactions: WalletTransaction[] | null
      wallet: Wallet | null
    }
  | { kind: 'error'; stamp: string }

type Notice = { text: string; tone: 'error' | 'success' }

const SUBSCRIBE_PREFIX = 'subscribe:'

/** Fetch + parse JSON, resolving to null on any transport/HTTP error. */
async function loadJson<T>(url: string): Promise<null | T> {
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export const BillingPanel: React.FC<Props> = ({
  adminTenantIds,
  initialTenantId,
  lang,
  superAdmin,
  tenantOptions,
}) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api

  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [result, setResult] = React.useState<LoadResult | null>(null)
  const [busy, setBusy] = React.useState<null | string>(null)
  const [notice, setNotice] = React.useState<Notice | null>(null)

  const stamp = `${tenant}:${reloadKey}`
  const fmt = React.useMemo(() => createFormatters(lang), [lang])

  const canManage = superAdmin || (tenant !== null && adminTenantIds.includes(tenant))

  const apiURL = React.useCallback(
    (path: `/${string}`) => formatAdminURL({ apiRoute, path }),
    [apiRoute],
  )

  const withTenant = React.useCallback(
    (path: `/${string}`, id: string) => `${apiURL(path)}?tenant=${encodeURIComponent(id)}`,
    [apiURL],
  )

  // Auto-dismiss transient notices
  React.useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(id)
  }, [notice])

  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false

    const run = async (): Promise<void> => {
      const summary = await loadJson<BillingSummary>(withTenant('/billing/summary', tenant))
      if (summary === null) {
        if (!cancelled) setResult({ kind: 'error', stamp })
        return
      }
      // Secondary resources — best-effort, in parallel. Failures degrade to null.
      const [plansRes, walletRes, txnRes, invoiceRes] = await Promise.all([
        loadJson<{ plans: Plan[] }>(apiURL('/billing/plans')),
        loadJson<{ wallet: null | Wallet }>(withTenant('/billing/wallet', tenant)),
        loadJson<{ transactions: WalletTransaction[] }>(
          withTenant('/billing/wallet/transactions', tenant),
        ),
        loadJson<{ invoices: Invoice[] }>(withTenant('/billing/invoices', tenant)),
      ])
      if (cancelled) return
      setResult({
        invoices: invoiceRes?.invoices ?? null,
        kind: 'ready',
        plans: plansRes?.plans ?? null,
        stamp,
        summary,
        transactions: txnRes?.transactions ?? null,
        wallet: walletRes ? (walletRes.wallet ?? null) : null,
      })
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [apiURL, stamp, tenant, withTenant])

  const refresh = React.useCallback(() => setReloadKey((key) => key + 1), [])

  const runMutation = React.useCallback(
    async (
      busyKey: string,
      path: `/${string}`,
      body: Record<string, unknown>,
      successKey: 'subscribeSuccess' | 'subscriptionCanceled' | 'topupSuccess',
    ): Promise<void> => {
      if (!tenant || !canManage || busy) return
      setBusy(busyKey)
      setNotice(null)
      try {
        const res = await fetch(apiURL(path), {
          body: JSON.stringify(body),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { checkoutUrl?: null | string }
        if (data.checkoutUrl) {
          window.location.assign(data.checkoutUrl)
          return
        }
        setNotice({ text: t(lang, successKey), tone: 'success' })
        refresh()
      } catch {
        setNotice({ text: t(lang, 'updateFailed'), tone: 'error' })
      } finally {
        setBusy(null)
      }
    },
    [apiURL, busy, canManage, lang, refresh, tenant],
  )

  const subscribe = (planCode: string): void => {
    if (!window.confirm(t(lang, 'confirmSubscribe'))) return
    void runMutation(
      `${SUBSCRIBE_PREFIX}${planCode}`,
      '/billing/subscribe',
      { planCode, tenant },
      'subscribeSuccess',
    )
  }

  const cancelPlan = (): void => {
    if (!window.confirm(t(lang, 'confirmCancel'))) return
    void runMutation('cancel', '/billing/cancel', { tenant }, 'subscriptionCanceled')
  }

  const topup = (amountCents: number): void => {
    void runMutation('topup', '/billing/wallet/topup', { amountCents, tenant }, 'topupSuccess')
  }

  const downloadUrlFor = React.useCallback(
    (invoice: Invoice): null | string => {
      if (invoice.downloadUrl) return invoice.downloadUrl
      if (!tenant || !invoice.id) return null
      return withTenant(
        `/billing/invoices/${encodeURIComponent(invoice.id)}/download` as `/${string}`,
        tenant,
      )
    },
    [tenant, withTenant],
  )

  if (!tenant) {
    return (
      <div style={cardStyle}>
        <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'noTenant')}</p>
      </div>
    )
  }

  const tenantSelect =
    tenantOptions.length > 1 ? (
      <div style={{ marginBottom: 'calc(var(--base, 20px) * 0.75)' }}>
        <label style={{ ...mutedStyle, display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
          {t(lang, 'workspace')}
        </label>
        <select
          onChange={(event) => {
            setNotice(null)
            setTenant(event.target.value)
          }}
          style={{ ...inputStyle, maxWidth: 320, width: '100%' }}
          value={tenant}
        >
          {tenantOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    ) : null

  const noticeCard = notice ? (
    <div
      role="alert"
      style={{
        ...cardStyle,
        borderColor:
          notice.tone === 'error'
            ? 'var(--theme-error-200, #f3c2c2)'
            : 'var(--theme-success-200, #bfe6cd)',
        color:
          notice.tone === 'error'
            ? 'var(--theme-error-750, #8f1f1f)'
            : 'var(--theme-success-750, #14713d)',
        marginBottom: 'calc(var(--base, 20px) * 0.75)',
      }}
    >
      {notice.text}
    </div>
  ) : null

  const loading = result === null || result.stamp !== stamp

  if (loading) {
    return (
      <div>
        {tenantSelect}
        {noticeCard}
        <div style={cardStyle}>
          <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'loading')}</p>
        </div>
      </div>
    )
  }

  if (result.kind === 'error') {
    return (
      <div>
        {tenantSelect}
        {noticeCard}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 0.35rem' }}>{t(lang, 'errorTitle')}</h3>
          <p style={{ ...mutedStyle, margin: '0 0 0.75rem' }}>{t(lang, 'errorHint')}</p>
          <button onClick={refresh} style={neutralButtonStyle} type="button">
            {t(lang, 'retry')}
          </button>
        </div>
      </div>
    )
  }

  const { invoices, plans, summary, transactions, wallet } = result
  const subscribingCode =
    busy && busy.startsWith(SUBSCRIBE_PREFIX) ? busy.slice(SUBSCRIBE_PREFIX.length) : null

  return (
    <div>
      {tenantSelect}
      {noticeCard}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--base, 20px) * 0.75)' }}
      >
        <SubscriptionCard
          busy={busy === 'cancel'}
          canManage={canManage}
          fmt={fmt}
          lang={lang}
          onCancel={cancelPlan}
          summary={summary}
        />

        <UsageMeters fmt={fmt} lang={lang} summary={summary} />

        <PlanCards
          busyCode={subscribingCode}
          canManage={canManage}
          currentPlanCode={summary.plan?.code ?? null}
          fmt={fmt}
          lang={lang}
          onSubscribe={subscribe}
          plans={plans}
        />

        <WalletCard
          busy={busy === 'topup'}
          canManage={canManage}
          fmt={fmt}
          lang={lang}
          onTopup={topup}
          transactions={transactions}
          wallet={wallet}
        />

        <InvoicesTable
          downloadUrlFor={downloadUrlFor}
          fmt={fmt}
          invoices={invoices}
          lang={lang}
        />
      </div>
    </div>
  )
}
