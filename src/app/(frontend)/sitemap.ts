import type { MetadataRoute } from 'next'

import { getPayload } from 'payload'

import config from '@payload-config'

// Queries the DB, so it must render per-request — never prerendered at build
// time (the build has no migrated D1). Keeps `next build` from hitting D1.
export const dynamic = 'force-dynamic'

/**
 * Marketing-site sitemap (served at /sitemap.xml). Lists published page slugs.
 * Base URL comes from NEXT_PUBLIC_SERVER_URL; falls back to a relative root so
 * local dev still produces valid entries.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SERVER_URL ?? ''
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 1000,
    pagination: false,
    select: { slug: true, updatedAt: true },
  })

  const pages: MetadataRoute.Sitemap = docs
    .filter((d): d is typeof d & { slug: string } => Boolean(d.slug))
    .map((d) => ({
      url: `${base}/${d.slug === 'home' ? '' : d.slug}`,
      lastModified: d.updatedAt ? new Date(d.updatedAt) : undefined,
    }))

  return [{ url: `${base}/`, lastModified: new Date() }, ...pages]
}
