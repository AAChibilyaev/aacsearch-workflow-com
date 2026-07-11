import type { CollectionAfterLoginHook } from 'payload'

import { generateCookie, getCookieExpiration, mergeHeaders } from 'payload'

/**
 * Matches the login request's domain to a tenant and sets the
 * 'payload-tenant' cookie so the admin pre-selects that tenant.
 */
export const setCookieBasedOnDomain: CollectionAfterLoginHook = async ({ req, user }) => {
  const relatedTenant = await req.payload.find({
    collection: 'tenants',
    depth: 0,
    limit: 1,
    where: {
      domain: {
        equals: req.headers.get('host'),
      },
    },
  })

  if (relatedTenant && relatedTenant.docs.length > 0) {
    const tenantCookie = generateCookie({
      name: 'payload-tenant',
      expires: getCookieExpiration({ seconds: 7200 }),
      path: '/',
      returnCookieAsObject: false,
      value: String(relatedTenant.docs[0].id),
    })

    const newHeaders = new Headers({
      'Set-Cookie': tenantCookie as string,
    })

    req.responseHeaders = req.responseHeaders
      ? mergeHeaders(req.responseHeaders, newHeaders)
      : newHeaders
  }

  return user
}
