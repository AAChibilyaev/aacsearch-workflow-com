import type { Payload } from 'payload'

/**
 * Shared usage-metering utilities. SHARED CONTRACT — imported by the billing
 * plugin (/billing/events), the search gateway (per-search metering) and the
 * integrations ingestion job. Lago is the metering backend but must stay
 * invisible: nothing exported here may leak into customer-facing responses.
 */

export type LagoClientOptions = {
  /** e.g. https://api.getlago.com/api/v1 (or self-hosted URL) */
  apiUrl?: string
  apiKey?: string
}

export const getLagoClient = async (opts: LagoClientOptions) => {
  const { Client } = await import('lago-javascript-client')
  return Client(opts.apiKey as string, {
    // Honors Retry-After on 429s — never hand-roll a retry loop
    rateLimitRetry: {},
    ...(opts.apiUrl ? { baseUrl: opts.apiUrl } : {}),
  })
}

/**
 * Deterministic transaction id: hash(tenant, metric code, properties, period).
 * Retries of the same usage event never double-bill — Lago dedupes on it.
 */
export const deterministicTransactionId = async (
  tenant: string,
  code: string,
  properties: Record<string, unknown> | undefined,
  period: string,
): Promise<string> => {
  const input = JSON.stringify([tenant, code, properties ?? {}, period])
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 40)
}

export type UsageEvent = {
  /** billable metric code in the billing backend, e.g. 'search_requests' */
  code: string
  /** tenant id — used as external_subscription_id */
  tenant: string
  properties?: Record<string, unknown>
  /** caller-provided idempotency key; derived from (tenant, code, properties, hour) when omitted */
  transactionId?: string
}

/**
 * Fire-and-forget usage metering. NEVER throws and never blocks the caller's
 * response path — billing outages must not break search or ingestion.
 */
export const emitUsageEvent = async (
  opts: LagoClientOptions,
  event: UsageEvent,
  logger: Payload['logger'],
): Promise<void> => {
  if (!opts.apiKey) return
  try {
    const period = new Date().toISOString().slice(0, 13)
    const transaction_id =
      event.transactionId ??
      (await deterministicTransactionId(event.tenant, event.code, event.properties, period))
    const client = await getLagoClient(opts)
    await client.events.createEvent({
      event: {
        code: event.code,
        external_subscription_id: event.tenant,
        properties: event.properties,
        transaction_id,
      },
    })
  } catch (err) {
    logger.error({ err, msg: 'usage event failed' })
  }
}
