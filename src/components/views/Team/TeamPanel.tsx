'use client'

import { Banner, Button, Pill, SelectInput, TextInput, useConfig } from '@payloadcms/ui'
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
  /** id of the signed-in user — their own row can't be self-managed here */
  currentUserId: string
  initialTenantId: null | string
  lang: string
  members: Member[]
  tenantOptions: TenantOption[]
}

// ---------------------------------------------------------------------------
// Layout tokens. Interactive controls, feedback and badges all use native
// @payloadcms/ui components (Button / SelectInput / TextInput / Pill / Banner);
// only the section wrappers and the members table are theme-token divs, exactly
// as Payload's own custom views compose layout around its UI primitives.
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  padding: 'calc(var(--base, 20px) * 0.9)',
}

const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }

const sectionHeadingStyle: React.CSSProperties = { margin: '0 0 0.6rem' }

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

/** Role shown as a native Payload Pill (success for admins, neutral otherwise). */
const RoleBadge: React.FC<{ lang: string; role: string }> = ({ lang, role }) => {
  const isAdmin = role === 'tenant-admin'
  return (
    <Pill pillStyle={isAdmin ? 'success' : 'light-gray'}>
      {t(lang, isAdmin ? 'roleAdmin' : 'roleViewer')}
    </Pill>
  )
}

type Notice = { text: string; tone: 'error' | 'success' }

/** Feedback line rendered as a native Payload Banner. */
const NoticeBanner: React.FC<{ notice: Notice | null }> = ({ notice }) =>
  notice ? (
    <Banner type={notice.tone === 'success' ? 'success' : 'error'}>{notice.text}</Banner>
  ) : null

/** Pull the selected string value out of SelectInput's Option-based onChange. */
const selectedValue = (value: unknown): string => {
  const opt = Array.isArray(value) ? value[0] : value
  if (opt && typeof opt === 'object' && 'value' in opt) {
    return String((opt as { value: unknown }).value)
  }
  return typeof opt === 'string' ? opt : ''
}

export const TeamPanel: React.FC<Props> = ({
  currentUserId,
  initialTenantId,
  lang,
  members,
  tenantOptions,
}) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<'tenant-admin' | 'tenant-viewer'>('tenant-viewer')
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState<Notice | null>(null)

  // Local copy so role changes / removals reflect instantly without a full
  // reload (the whole panel remounts on tenant switch, so seeding once is fine).
  const [rows, setRows] = React.useState<Member[]>(members)
  const [memberNotice, setMemberNotice] = React.useState<Notice | null>(null)
  const [busyId, setBusyId] = React.useState<null | string>(null)
  const [confirmRemoveId, setConfirmRemoveId] = React.useState<null | string>(null)

  const memberEndpoint = formatAdminURL({ apiRoute, path: '/team/member' })

  const roleOptions = [
    { label: t(lang, 'roleViewer'), value: 'tenant-viewer' },
    { label: t(lang, 'roleAdmin'), value: 'tenant-admin' },
  ]

  const changeRole = async (member: Member, nextRole: string): Promise<void> => {
    if (busyId || nextRole === member.role || !initialTenantId) return
    setBusyId(member.id)
    setMemberNotice(null)
    try {
      const res = await fetch(memberEndpoint, {
        body: JSON.stringify({ role: nextRole, tenant: initialTenantId, userId: member.id }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) {
        setMemberNotice({ text: t(lang, 'roleChangeError'), tone: 'error' })
      } else {
        setRows((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: nextRole } : m)))
        setMemberNotice({ text: t(lang, 'roleChanged'), tone: 'success' })
      }
    } catch {
      setMemberNotice({ text: t(lang, 'roleChangeError'), tone: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  const removeMember = async (member: Member): Promise<void> => {
    if (busyId || !initialTenantId) return
    setBusyId(member.id)
    setMemberNotice(null)
    try {
      const res = await fetch(memberEndpoint, {
        body: JSON.stringify({ tenant: initialTenantId, userId: member.id }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      })
      if (!res.ok) {
        setMemberNotice({ text: t(lang, 'removeError'), tone: 'error' })
      } else {
        setRows((prev) => prev.filter((m) => m.id !== member.id))
        setMemberNotice({ text: t(lang, 'memberRemoved'), tone: 'success' })
      }
    } catch {
      setMemberNotice({ text: t(lang, 'removeError'), tone: 'error' })
    } finally {
      setBusyId(null)
      setConfirmRemoveId(null)
    }
  }

  // Invoked by both the form's onSubmit (Enter key) and the Button's onClick;
  // the `busy` guard makes a double-fire a no-op.
  const invite = async (event?: React.FormEvent): Promise<void> => {
    event?.preventDefault()
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
      if (!res.ok) {
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
  const onTenantChange = (value: unknown): void => {
    const next = selectedValue(value)
    if (!next) return
    document.cookie = `payload-tenant=${encodeURIComponent(next)}; path=/; SameSite=Lax`
    window.location.reload()
  }

  const tenantSelect =
    tenantOptions.length > 1 ? (
      <div style={{ marginBottom: 'calc(var(--base, 20px) * 0.75)', maxWidth: 320 }}>
        <SelectInput
          isClearable={false}
          label={t(lang, 'workspace')}
          name="workspace"
          onChange={onTenantChange}
          options={tenantOptions.map((option) => ({ label: option.label, value: option.id }))}
          path="workspace"
          value={initialTenantId}
        />
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

          {rows.length === 0 ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'membersEmpty')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 560, width: '100%' }}>
                <thead>
                  <tr>
                    {[
                      t(lang, 'colEmail'),
                      t(lang, 'colRole'),
                      t(lang, 'colJoined'),
                      t(lang, 'colActions'),
                    ].map((heading) => (
                      <th key={heading} style={thStyle}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((member) => {
                    const isSelf = member.id === currentUserId
                    const rowBusy = busyId === member.id
                    return (
                      <tr key={member.id}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>
                          {member.email}
                          {isSelf && (
                            <span style={{ ...mutedStyle, fontWeight: 400, marginLeft: 6 }}>
                              ({t(lang, 'you')})
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {isSelf ? (
                            <RoleBadge lang={lang} role={member.role} />
                          ) : (
                            <div style={{ minWidth: 180 }}>
                              <SelectInput
                                isClearable={false}
                                name={`role-${member.id}`}
                                onChange={(value) => void changeRole(member, selectedValue(value))}
                                options={roleOptions}
                                path={`role-${member.id}`}
                                readOnly={rowBusy}
                                value={member.role}
                              />
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          {formatDate(lang, member.createdAt)}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          {isSelf ? (
                            <span style={mutedStyle}>—</span>
                          ) : confirmRemoveId === member.id ? (
                            <span style={{ alignItems: 'center', display: 'inline-flex', gap: '0.4rem' }}>
                              <Button
                                buttonStyle="error"
                                disabled={rowBusy}
                                onClick={() => void removeMember(member)}
                                size="small"
                              >
                                {t(lang, 'removeConfirm')}
                              </Button>
                              <Button
                                buttonStyle="secondary"
                                disabled={rowBusy}
                                onClick={() => setConfirmRemoveId(null)}
                                size="small"
                              >
                                {t(lang, 'removeCancel')}
                              </Button>
                            </span>
                          ) : (
                            <Button
                              buttonStyle="secondary"
                              disabled={rowBusy}
                              onClick={() => {
                                setMemberNotice(null)
                                setConfirmRemoveId(member.id)
                              }}
                              size="small"
                            >
                              {t(lang, 'removeMember')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <NoticeBanner notice={memberNotice} />
        </div>

        {/* Invite a member — reuses Payload auth: creates the tenant-scoped user
            (access-controlled) and emails a set-password link via forgotPassword. */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>{t(lang, 'inviteTitle')}</h3>
          <form onSubmit={invite}>
            <div style={{ alignItems: 'flex-end', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ flex: '1 1 220px' }}>
                <TextInput
                  label={t(lang, 'inviteEmail')}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  path="invite-email"
                  placeholder="name@example.com"
                  value={email}
                />
              </div>
              <div style={{ minWidth: 180 }}>
                <SelectInput
                  isClearable={false}
                  label={t(lang, 'colRole')}
                  name="invite-role"
                  onChange={(value) =>
                    setRole(selectedValue(value) === 'tenant-admin' ? 'tenant-admin' : 'tenant-viewer')
                  }
                  options={roleOptions}
                  path="invite-role"
                  value={role}
                />
              </div>
              <Button buttonStyle="primary" disabled={busy} type="submit">
                {t(lang, 'inviteSend')}
              </Button>
            </div>
          </form>
          <NoticeBanner notice={notice} />
        </div>
      </div>
    </div>
  )
}
