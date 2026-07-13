import React from 'react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@payload-config'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RefreshRouteOnSave } from './RefreshRouteOnSave'

const LOCALES = ['en', 'ru', 'de'] as const
type Locale = (typeof LOCALES)[number]

export default async function Page(props: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const { slug } = await props.params
  const { locale } = await props.searchParams
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
    locale: LOCALES.includes(locale as Locale) ? (locale as Locale) : 'en',
  })

  const page = docs[0]

  if (!page) {
    notFound()
  }

  return (
    <article className="py-16">
      <RefreshRouteOnSave />
      <RenderBlocks blocks={page.layout} />
    </article>
  )
}
