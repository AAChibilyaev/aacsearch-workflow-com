/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes'

// Payload's GraphQL route must never be statically prerendered (Next 15 build
// otherwise fails with PageNotFoundError). GraphQL is unreliable on Workers
// anyway — REST/Local API is the supported surface.
export const dynamic = 'force-dynamic'

export const POST = GRAPHQL_POST(config)

export const OPTIONS = REST_OPTIONS(config)
