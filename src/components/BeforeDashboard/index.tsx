import type { ServerProps } from 'payload'

import React from 'react'

import { isSuperAdmin } from '@/access/isSuperAdmin'

/**
 * Tenant-scoped dashboard overview. Counts run through access control
 * (overrideAccess: false), so customers see only their tenant's numbers
 * while the super-admin sees platform totals.
 */
export async function BeforeDashboard(props: ServerProps) {
  const { payload, user } = props

  if (!user) return null

  const count = async (collection: 'collection-definitions' | 'documents' | 'pages' | 'products') => {
    try {
      const { totalDocs } = await payload.count({
        collection,
        overrideAccess: false,
        user,
      })
      return totalDocs
    } catch {
      return 0
    }
  }

  const [definitions, documents, pages, products] = await Promise.all([
    count('collection-definitions'),
    count('documents'),
    count('pages'),
    count('products'),
  ])

  const cards: { count: number; href: string; label: string }[] = [
    { count: definitions, href: '/admin/collections/collection-definitions', label: 'Collections' },
    { count: documents, href: '/admin/collections/documents', label: 'Documents' },
    { count: pages, href: '/admin/collections/pages', label: 'Pages' },
    { count: products, href: '/admin/collections/products', label: 'Products' },
  ]

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-100)',
        borderRadius: '4px',
        marginBottom: 'calc(var(--base) * 1.5)',
        padding: 'calc(var(--base) * 1)',
      }}
    >
      <h2 style={{ margin: '0 0 calc(var(--base) * 0.75)' }}>AACSearch</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(var(--base) * 0.75)' }}>
        {cards.map((card) => (
          <a
            href={card.href}
            key={card.href}
            style={{
              background: 'var(--theme-elevation-50)',
              borderRadius: '4px',
              flex: '1 1 140px',
              padding: 'calc(var(--base) * 0.75)',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{card.count}</div>
            <div style={{ color: 'var(--theme-elevation-600)' }}>{card.label}</div>
          </a>
        ))}
      </div>
      {isSuperAdmin(user) && (
        <p style={{ color: 'var(--theme-elevation-500)', margin: 'calc(var(--base) * 0.75) 0 0' }}>
          {/* API endpoints, not Next pages — <Link> prefetch would 404 for the crawler */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          API docs: <a href="/api/docs">/api/docs</a> · OpenAPI spec:{' '}
          <a href="/api/openapi.json">/api/openapi.json</a>
        </p>
      )}
    </div>
  )
}
