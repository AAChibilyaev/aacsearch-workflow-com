'use client'

import React from 'react'

import type { Formatters, Invoice } from './shared'

import { t } from './i18n'
import {
  cardStyle,
  humanizeToken,
  mutedStyle,
  sectionHeadingStyle,
  StatusPill,
  toneForGenericStatus,
} from './shared'

type Props = {
  /** Resolves the customer-safe PDF-proxy link for an invoice (never a vendor URL). */
  downloadUrlFor: (invoice: Invoice) => null | string
  fmt: Formatters
  invoices: null | Invoice[]
  lang: string
}

const paymentLabel = (lang: string, status: string): string => {
  const n = status.toLowerCase()
  if (['paid', 'succeeded'].includes(n)) return t(lang, 'paymentSucceeded')
  if (['failed'].includes(n)) return t(lang, 'paymentFailed')
  if (['pending', 'processing'].includes(n)) return t(lang, 'paymentPending')
  return humanizeToken(status)
}

/** Invoice history with a download link per row. */
export const InvoicesTable: React.FC<Props> = ({ downloadUrlFor, fmt, invoices, lang }) => {
  return (
    <div style={cardStyle}>
      <h3 style={sectionHeadingStyle}>{t(lang, 'invoicesTitle')}</h3>

      {!invoices || invoices.length === 0 ? (
        <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'invoicesEmpty')}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 560, width: '100%' }}>
            <thead>
              <tr>
                {[
                  t(lang, 'colInvoice'),
                  t(lang, 'colDate'),
                  t(lang, 'colStatus'),
                  t(lang, 'colTotal'),
                  '',
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
              {invoices.map((invoice) => {
                const issued = invoice.issuingDate ?? invoice.issuedAt ?? null
                const href = downloadUrlFor(invoice)
                return (
                  <tr key={invoice.id || invoice.number}>
                    <td style={{ fontWeight: 500, padding: '0.5rem 0.75rem 0.5rem 0' }}>
                      {invoice.number || invoice.id}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', whiteSpace: 'nowrap' }}>
                      {issued ? fmt.date(issued) : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem 0.5rem 0' }}>
                      <StatusPill
                        label={paymentLabel(lang, invoice.paymentStatus)}
                        tone={toneForGenericStatus(invoice.paymentStatus)}
                      />
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', whiteSpace: 'nowrap' }}>
                      {fmt.money(invoice.totalCents, invoice.currency)}
                    </td>
                    <td style={{ padding: '0.5rem 0 0.5rem 0', whiteSpace: 'nowrap' }}>
                      {href ? (
                        <a
                          href={href}
                          rel="noopener noreferrer"
                          style={{ color: 'var(--theme-text, inherit)', textDecoration: 'underline' }}
                          target="_blank"
                        >
                          {t(lang, 'download')}
                        </a>
                      ) : (
                        <span style={mutedStyle}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
