import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import config from '@payload-config'
import { RenderBlocks } from '@/blocks/RenderBlocks'

const LOCALES = ['en', 'ru', 'de'] as const
type Locale = (typeof LOCALES)[number]

// Reads pages from D1 per-request — never prerender at build (unmigrated DB).
export const dynamic = 'force-dynamic'

/**
 * Marketing home page. Renders the `home`-slug Page's blocks when an editor has
 * created one; otherwise shows a minimal built-in hero so the site is never
 * blank. Edit content in the admin → Pages → slug "home".
 */
export default async function HomePage(props: { searchParams: Promise<{ locale?: string }> }) {
  const { locale } = await props.searchParams
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    locale: LOCALES.includes(locale as Locale) ? (locale as Locale) : 'en',
  })

  const page = docs[0]

  if (page?.layout?.length) {
    return (
      <article className="py-16">
        <RenderBlocks blocks={page.layout} />
      </article>
    )
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Search that understands your data</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        AACSearch is a multi-tenant search SaaS — typo-tolerant search, AI answers, and connectors,
        managed from one panel.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          href="/admin"
        >
          Open admin
        </Link>
        <Link className="rounded-full border border-border px-5 py-2.5 text-sm font-medium" href="/api/docs">
          API docs
        </Link>
      </div>
    </section>
  )
}
