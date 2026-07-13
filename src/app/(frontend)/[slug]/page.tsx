import React from 'react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@payload-config'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RefreshRouteOnSave } from './RefreshRouteOnSave'
import { getLocale } from '@/lib/locale'

export const dynamic = 'force-dynamic'

export default async function Page(props: { params: Promise<{ slug: string }> }) {
    const { slug } = await props.params
    const locale = await getLocale()
    const payload = await getPayload({ config })

    const { docs } = await payload.find({
        collection: 'pages',
        where: { slug: { equals: slug } },
        limit: 1,
        locale: locale as never,
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
