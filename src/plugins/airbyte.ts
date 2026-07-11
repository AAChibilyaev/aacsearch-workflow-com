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

const airbyteFetch = async (
  opts: AirbytePluginOptions,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  return fetch(`${opts.apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${opts.apiToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

const pipelineEndpoints = (opts: AirbytePluginOptions): Endpoint[] => [
  {
    path: '/pipelines/connections',
    method: 'get',
    handler: async (req) => {
      if (!isSuperAdmin(req.user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const qs = opts.workspaceId ? `?workspaceIds=${opts.workspaceId}` : ''
      const res = await airbyteFetch(opts, `/connections${qs}`)
      return Response.json(await res.json(), { status: res.status })
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
      const qs = connectionId ? `?connectionId=${connectionId}` : ''
      const res = await airbyteFetch(opts, `/jobs${qs}`)
      return Response.json(await res.json(), { status: res.status })
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
      return Response.json(await res.json(), { status: res.status })
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
