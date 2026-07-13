'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { t } from './i18n'

export type TenantOption = { id: string; label: string }

/** Serializable member row prepared server-side (tenant-scoped). */
export type Member = {
  createdAt: null | string
  email: string
  id: string
  role: string
}

type Props = {
  initialTenantId: null | string
  lang: string
  members: Member[]
  tenantOptions: TenantOption[]
}

// ---------------------------------------------------------------------------
// Theme-aware style tokens (match the sibling Analytics / Billing panels)
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  padding: 'calc(var(--base, 20px) * 0.9)',
}

const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }

const sectionHeadingStyle: React.CSSProperties = { margin: '0 0 0.6rem' }

const inputStyle: React.CSSProperties = {
  background: 'var(--theme-input-bg, var(--theme-elevation-0, #fff))',
  border: '1px solid var(--theme-elevation-150, #ccc)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  padding: '0.45rem 0.6rem',
}

const thStyle: React.CSSProperties = {
  ...mutedStyle,
  borderBottom: '1px solid var(--theme-elevation-100, #e3e3e3)',
  fontSize: '0.8rem',
  fontWeight: 500,
  padding: '0.4rem 0.75rem 0.4rem 0',
  textAlign: 'left',
}

const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--theme-elevation-50, #f0f0f0)',
  padding: '0.5rem 0.75rem 0.5rem 0',
  verticalAlign: 'middle',
}

const columnStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(var(--base, 20px) * 0.75)',
}

// ---------------------------------------------------------------------------
// Small presentational primitives
// ---------------------------------------------------------------------------

/** Locale-aware date formatter, degrading to the raw value on error. */
const formatDate = (lang: string, value: null | string): string => {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  try {
    return date.toLocaleDateString(lang)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

/** Colored pill for a member's role within this workspace. */
const RoleBadge: React.FC<{ lang: string; role: string }> = ({ lang, role }) => {
  const isAdmin = role === 'tenant-admin'
  const style: React.CSSProperties = {
    background: isAdmin
      ? 'var(--theme-success-100, #e2f3e9)'
      : 'var(--theme-elevation-100, #ededed)',
    borderRadius: 999,
    color: isAdmin
      ? 'var(--theme-success-700, #237a47)'
      : 'var(--theme-elevation-700, #4a4a4a)',
    display: 'inline-block',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.15rem 0.6rem',
    whiteSpace: 'nowrap',
  }
  return <span style={style}>{t(lang, isAdmin ? 'roleAdmin' : 'roleViewer')}</span>
}

type Notice = { text: string; tone: 'error' | 'success' }

export const TeamPanel: React.FC<Props> = ({ initialTenantId, lang, members, tenantOptions }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<'tenant-admin' | 'tenant-viewer'>('tenant-viewer')
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState<Notice | null>(null)

  const invite = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (busy || !initialTenantId || !email.trim()) return
    setBusy(true)
    setNotice(null)
    try {
      const res = await fetch(formatAdminURL({ apiRoute, path: '/team/invite' }), {
        body: JSON.stringify({ email: email.trim(), role, tenant: initialTenantId }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (res.status === 409) {
        setNotice({ text: t(lang, 'inviteExists'), tone: 'error' })
      } else if (!res.ok) {
        setNotice({ text: t(lang, 'inviteError'), tone: 'error' })
      } else {
        setNotice({ text: t(lang, 'inviteSuccess'), tone: 'success' })
        setEmail('')
        // Reload so the server re-queries the (now larger) member list
        setTimeout(() => window.location.reload(), 900)
      }
    } catch {
      setNotice({ text: t(lang, 'inviteError'), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  if (!initialTenantId) {
    return (
      <div style={cardStyle}>
        <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'noTenant')}</p>
      </div>
    )
  }

  // Switching workspace re-scopes the whole admin: persist the selection in the
  // multi-tenant plugin cookie and reload so the server re-queries members for
  // the newly selected tenant (never fetches across tenants client-side).
  const onTenantChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const next = event.target.value
    document.cookie = `payload-tenant=${encodeURIComponent(next)}; path=/; SameSite=Lax`
    window.location.reload()
  }

  const tenantSelect =
    tenantOptions.length > 1 ? (
      <div style={{ marginBottom: 'calc(var(--base, 20px) * 0.75)' }}>
        <label style={{ ...mutedStyle, display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
          {t(lang, 'workspace')}
        </label>
        <select
          onChange={onTenantChange}
          style={{ ...inputStyle, maxWidth: 320, width: '100%' }}
          value={initialTenantId}
        >
          {tenantOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    ) : null

  return (
    <div>
      {tenantSelect}
      <div style={columnStackStyle}>
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>{t(lang, 'membersTitle')}</h3>
          <p style={{ ...mutedStyle, fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
            {t(lang, 'intro')}
          </p>

          {members.length === 0 ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'membersEmpty')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 480, width: '100%' }}>
                <thead>
                  <tr>
                    {[t(lang, 'colEmail'), t(lang, 'colRole'), t(lang, 'colJoined')].map(
                      (heading) => (
                        <th key={heading} style={thStyle}>
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{member.email}</td>
                      <td style={tdStyle}>
                        <RoleBadge lang={lang} role={member.role} />
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        {formatDate(lang, member.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite a member — reuses Payload auth: creates the tenant-scoped user
            (access-controlled) and emails a set-password link via forgotPassword. */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>{t(lang, 'inviteTitle')}</h3>
          <form onSubmit={invite} style={{ alignItems: 'flex-end', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div style={{ flex: '1 1 220px' }}>
              <label style={{ ...mutedStyle, display: 'block', fontSize: '0.8rem', marginBottom: 4 }}>
                {t(lang, 'inviteEmail')}
              </label>
              <input
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ ...inputStyle, width: '100%' }}
                type="email"
                value={email}
              />
            </div>
            <div>
              <label style={{ ...mutedStyle, display: 'block', fontSize: '0.8rem', marginBottom: 4 }}>
                {t(lang, 'colRole')}
              </label>
              <select
                onChange={(e) => setRole(e.target.value === 'tenant-admin' ? 'tenant-admin' : 'tenant-viewer')}
                style={inputStyle}
                value={role}
              >
                <option value="tenant-viewer">{t(lang, 'roleViewer')}</option>
                <option value="tenant-admin">{t(lang, 'roleAdmin')}</option>
              </select>
            </div>
            <button
              disabled={busy}
              style={{
                background: 'var(--theme-success-500, #3faf68)',
                border: 'none',
                borderRadius: 4,
                color: 'var(--theme-base-0, #fff)',
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.6 : 1,
                padding: '0.5rem 1rem',
              }}
              type="submit"
            >
              {t(lang, 'inviteSend')}
            </button>
          </form>
          {notice && (
            <p
              style={{
                color:
                  notice.tone === 'success'
                    ? 'var(--theme-success-600, #237a47)'
                    : 'var(--theme-error-500, #d93030)',
                fontSize: '0.85rem',
                margin: '0.6rem 0 0',
              }}
            >
              {notice.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
