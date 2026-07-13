import type { Config, Endpoint, Plugin } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'

/**
 * Airbyte data-pipelines plugin.
 *
 * Airbyte ships NO official TypeScript SDK (Python/Java only), so this uses
 * the Airbyte REST API directly (https://reference.airbyte.com):
 *   GET  /v1/connections?workspaceIds=...
 *   POST /v1/jobs { connectionId, jobType: 'sync' }
 *
 * Pipeline management is platform-level, so endpoints are super-admin only.
 */
export type AirbytePluginOptions = {
  /** e.g. https://api.airbyte.com/v1 or https://<self-hosted>/api/public/v1 */
  apiUrl?: string
  /**
   * Static bearer token — Self-Managed/Enterprise only. Airbyte Cloud access
   * tokens expire after ~3 minutes, so Cloud MUST use clientId/clientSecret.
   */
  apiToken?: string
  /** OAuth application credentials (POST /applications/token, client_credentials). */
  clientId?: string
  clientSecret?: string
  workspaceId?: string
}

export const normalizeAirbyteBaseUrl = (apiUrl: string): string => apiUrl.replace(/\/+$/, '')

const REDACTED = '[redacted]'
const REDACTED_URL = '[redacted-url]'

const isUrlString = (value: string): boolean => /^https?:\/\//i.test(value)

const isSensitiveKey = (key: string): boolean =>
  /(authorization|credential|password|secret|token|api[_-]?key)/i.test(key)

const isUrlKey = (key: string): boolean => /(url|uri|host|endpoint|domain)/i.test(key)

export const sanitizeAirbytePayload = (value: unknown, key = ''): unknown => {
  if (isSensitiveKey(key)) return REDACTED
  if (typeof value === 'string') {
    if (isUrlKey(key) || isUrlString(value)) return REDACTED_URL
    return value
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeAirbytePayload(item))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = sanitizeAirbytePayload(childValue, childKey)
    }
    return out
  }
  return value
}

/** Forward limit/offset (Airbyte defaults to 20 rows) with sane bounds. */
const appendPagination = (params: URLSearchParams, query: Record<string, unknown> | undefined): void => {
  for (const key of ['limit', 'offset'] as const) {
    const raw = query?.[key]
    if (typeof raw !== 'string' || raw === '') continue
    const value = Number(raw)
    if (Number.isInteger(value) && value >= 0 && value <= 1000) params.set(key, String(value))
  }
}

const FETCH_TIMEOUT_MS = 15_000
/** Refresh margin below Airbyte Cloud's ~180s token lifetime. */
const TOKEN_TTL_FALLBACK_MS = 150_000
const TOKEN_REFRESH_MARGIN_MS = 30_000

let cachedToken: { expiresAt: number; value: string } | null = null

/**
 * Airbyte Cloud tokens live ~3 minutes, so a static env token 401s shortly
 * after deploy. With client credentials configured we mint a fresh token via
 * POST /applications/token and cache it just under its lifetime; a static
 * apiToken remains the fallback for self-managed instances.
 */
const getAirbyteAccessToken = async (opts: AirbytePluginOptions): Promise<string> => {
  if (!opts.clientId || !opts.clientSecret) return opts.apiToken as string
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value

  const res = await fetch(`${normalizeAirbyteBaseUrl(opts.apiUrl as string)}/applications/token`, {
    body: JSON.stringify({ client_id: opts.clientId, client_secret: opts.clientSecret }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'POST',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`airbyte token request failed (${res.status})`)
  const body = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!body.access_token) throw new Error('airbyte token response missing access_token')

  const ttlMs =
    typeof body.expires_in === 'number' && body.expires_in > 0
      ? Math.max(body.expires_in * 1000 - TOKEN_REFRESH_MARGIN_MS, 30_000)
      : TOKEN_TTL_FALLBACK_MS
  cachedToken = { expiresAt: Date.now() + ttlMs, value: body.access_token }
  return body.access_token
}

const airbyteFetch = async (
  opts: AirbytePluginOptions,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  const token = await getAirbyteAccessToken(opts)
  return fetch(`${normalizeAirbyteBaseUrl(opts.apiUrl as string)}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
}

/**
 * Network/token failures throw before any Response exists; without this guard
 * Payload's default 500 handler would serialize the raw error (which contains
 * the vendor hostname) into the response, bypassing sanitizeAirbytePayload.
 */
const airbyteProxy = async (
  opts: AirbytePluginOptions,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  try {
    const res = await airbyteFetch(opts, path, init)
    return await airbyteJsonResponse(res)
  } catch {
    return Response.json({ error: 'Pipeline backend unavailable' }, { status: 502 })
  }
}

const airbyteJsonResponse = async (res: Response): Promise<Response> => {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = { error: res.ok ? 'Empty response' : 'Pipeline backend request failed' }
  }
  return Response.json(sanitizeAirbytePayload(body), { status: res.status })
}

const pipelineEndpoints = (opts: AirbytePluginOptions): Endpoint[] => [
  {
    path: '/pipelines/connections',
    method: 'get',
    handler: async (req) => {
      if (!isSuperAdmin(req.user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const params = new URLSearchParams()
      if (opts.workspaceId) params.set('workspaceIds', opts.workspaceId)
      appendPagination(params, req.query)
      const qs = params.size ? `?${params.toString()}` : ''
      return airbyteProxy(opts, `/connections${qs}`)
    },
  },
  {
    path: '/pipelines/jobs',
    method: 'get',
    handler: async (req) => {
      if (!isSuperAdmin(req.user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const params = new URLSearchParams()
      // Scope to our workspace — the credential may span several.
      if (opts.workspaceId) params.set('workspaceIds', opts.workspaceId)
      const connectionId = req.query?.connectionId
      if (typeof connectionId === 'string' && connectionId) {
        params.set('connectionId', connectionId)
      }
      appendPagination(params, req.query)
      const qs = params.size ? `?${params.toString()}` : ''
      return airbyteProxy(opts, `/jobs${qs}`)
    },
  },
  {
    path: '/pipelines/sync',
    method: 'post',
    handler: async (req) => {
      if (!isSuperAdmin(req.user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const body = req.json ? await req.json() : {}
      const { connectionId, jobType } = body as { connectionId?: string; jobType?: string }
      if (!connectionId || typeof connectionId !== 'string') {
        return Response.json({ error: 'connectionId is required' }, { status: 400 })
      }
      const requestedType = jobType ?? 'sync'
      if (requestedType !== 'sync' && requestedType !== 'reset') {
        return Response.json({ error: 'jobType must be "sync" or "reset"' }, { status: 400 })
      }
      return airbyteProxy(opts, '/jobs', {
        body: JSON.stringify({ connectionId, jobType: requestedType }),
        method: 'POST',
      })
    },
  },
  {
    // Single job status/detail (poll a running sync/reset)
    path: '/pipelines/jobs/:id',
    method: 'get',
    handler: async (req) => {
      if (!isSuperAdmin(req.user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const jobId = req.routeParams?.id
      if (jobId === undefined || jobId === null || jobId === '') {
        return Response.json({ error: 'job id is required' }, { status: 400 })
      }
      return airbyteProxy(opts, `/jobs/${encodeURIComponent(String(jobId))}`)
    },
  },
  {
    // Cancel a running job (Airbyte API: DELETE /jobs/{jobId})
    path: '/pipelines/jobs/:id/cancel',
    method: 'post',
    handler: async (req) => {
      if (!isSuperAdmin(req.user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const jobId = req.routeParams?.id
      if (jobId === undefined || jobId === null || jobId === '') {
        return Response.json({ error: 'job id is required' }, { status: 400 })
      }
      return airbyteProxy(opts, `/jobs/${encodeURIComponent(String(jobId))}`, {
        method: 'DELETE',
      })
    },
  },
]

export const airbytePlugin =
  (opts: AirbytePluginOptions): Plugin =>
  (config: Config): Config => {
    const hasAuth = Boolean(opts.apiToken || (opts.clientId && opts.clientSecret))
    if (!opts.apiUrl || !hasAuth) return config

    return {
      ...config,
      endpoints: [...(config.endpoints ?? []), ...pipelineEndpoints(opts)],
    }
  }
