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
  apiToken?: string
  workspaceId?: string
}

export const normalizeAirbyteBaseUrl = (apiUrl: string): string => apiUrl.replace(/\/+$/, '')

const REDACTED = '[redacted]'
const REDACTED_URL = '[redacted-url]'

const isUrlString = (value: string): boolean => /^https?:\/\//i.test(value)

const isSensitiveKey = (key: string): boolean =>
  /(authorization|credential|password|secret|token|api[_-]?key)/i.test(key)

const isUrlKey = (key: string): boolean => /(url|uri)/i.test(key)

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

const airbyteFetch = async (
  opts: AirbytePluginOptions,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  return fetch(`${normalizeAirbyteBaseUrl(opts.apiUrl as string)}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${opts.apiToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
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
      const qs = opts.workspaceId ? `?workspaceIds=${encodeURIComponent(opts.workspaceId)}` : ''
      const res = await airbyteFetch(opts, `/connections${qs}`)
      return airbyteJsonResponse(res)
    },
  },
  {
    path: '/pipelines/jobs',
    method: 'get',
    handler: async (req) => {
      if (!isSuperAdmin(req.user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const connectionId = req.query?.connectionId as string
      const qs = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : ''
      const res = await airbyteFetch(opts, `/jobs${qs}`)
      return airbyteJsonResponse(res)
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
      const { connectionId } = body as { connectionId?: string }
      if (!connectionId) {
        return Response.json({ error: 'connectionId is required' }, { status: 400 })
      }
      const res = await airbyteFetch(opts, '/jobs', {
        body: JSON.stringify({ connectionId, jobType: 'sync' }),
        method: 'POST',
      })
      return airbyteJsonResponse(res)
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
      const res = await airbyteFetch(opts, `/jobs/${encodeURIComponent(String(jobId))}`)
      return airbyteJsonResponse(res)
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
      const res = await airbyteFetch(opts, `/jobs/${encodeURIComponent(String(jobId))}`, {
        method: 'DELETE',
      })
      return airbyteJsonResponse(res)
    },
  },
]

export const airbytePlugin =
  (opts: AirbytePluginOptions): Plugin =>
  (config: Config): Config => {
    if (!opts.apiUrl || !opts.apiToken) return config

    return {
      ...config,
      endpoints: [...(config.endpoints ?? []), ...pipelineEndpoints(opts)],
    }
  }
