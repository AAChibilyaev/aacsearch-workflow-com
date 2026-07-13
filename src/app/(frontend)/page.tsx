import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import config from '@payload-config'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { Button } from '@/components/ui/button'
import { getLocale, type Locale } from '@/lib/locale'

export const dynamic = 'force-dynamic'

const HERO: Record<Locale, { heading: string; sub: string; cta1: string; cta2: string }> = {
    en: {
        heading: 'Search that understands your data',
        sub: 'AACSearch is a multi-tenant search SaaS — typo-tolerant search, AI answers, and connectors, managed from one panel.',
        cta1: 'Open admin',
        cta2: 'API docs',
    },
    ru: {
        heading: 'Поиск, который понимает ваши данные',
        sub: 'AACSearch — SaaS для мультиарендного поиска: устойчивый к опечаткам поиск, AI-ответы и коннекторы — всё из одной панели.',
        cta1: 'Админка',
        cta2: 'API-документация',
    },
    de: {
        heading: 'Suche, die Ihre Daten versteht',
        sub: 'AACSearch ist eine mandantenfähige Such-SaaS — typo-tolerante Suche, KI-Antworten und Konnektoren, verwaltet von einer Oberfläche.',
        cta1: 'Admin öffnen',
        cta2: 'API-Dokumentation',
    },
}

export default async function HomePage() {
    const locale = await getLocale()
    const payload = await getPayload({ config })

    const { docs } = await payload.find({
        collection: 'pages',
        where: { slug: { equals: 'home' } },
        limit: 1,
        locale: locale as never,
    })

    const page = docs[0]

    if (page?.layout?.length) {
        return (
            <article className="py-16">
                <RenderBlocks blocks={page.layout} />
            </article>
        )
    }

    const t = HERO[locale] || HERO.en

    return (
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
            <h1 className="text-4xl font-semibold tracking-tight">{t.heading}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{t.sub}</p>
            <div className="mt-8 flex items-center justify-center gap-4">
                <Button asChild className="rounded-full" size="lg">
                    <Link href="/admin">{t.cta1}</Link>
                </Button>
                <Button asChild className="rounded-full" size="lg" variant="outline">
                    <Link href="/api/docs">{t.cta2}</Link>
                </Button>
            </div>
        </section>
    )
}
