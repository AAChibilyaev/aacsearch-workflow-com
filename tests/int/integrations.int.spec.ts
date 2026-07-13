// @vitest-environment node
import { createHash, createHmac } from 'node:crypto'

import type { PayloadRequest } from 'payload'

import { Nango } from '@nangohq/node'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createBoundedTtlCache } from '@/lib/billing/entitlements'
import {
  createIngestIntegrationRecordsTask,
  type IngestIntegrationRecordsInput,
} from '@/jobs/ingestIntegrationRecords'
import { normalizeAirbyteBaseUrl, sanitizeAirbytePayload } from '@/plugins/airbyte'
import {
  coerceIdValue,
  createTtlCache,
  deriveRecordTitle,
  extractRelationID,
  integrationLogoPath,
  mapConnection,
  mapProvider,
  mapRecordData,
  parseCursorMap,
  type CatalogProvider,
  type ConfiguredIntegration,
  type IntegrationDoc,
} from '@/lib/integrations/dto'

/**
 * White-label + webhook-security tests for the integrations track.
 * Pure by design: no DB, no dev server, no live vendor (live checks are
 * gated on NANGO_SECRET_KEY at the bottom).
 */

const VENDOR_PATTERN = /lago|nango|typesense|getlago/i

// Realistic vendor payloads — including vendor-branded URLs that the mappers
// MUST NOT let through to customers.
const vendorProvider: CatalogProvider = {
  auth_mode: 'OAUTH2',
  categories: ['documents', 'storage'],
  display_name: 'Google Drive',
  logo_url: 'https://app.nango.dev/images/template-logos/google-drive.svg',
  name: 'google-drive',
}

const vendorIntegration: ConfiguredIntegration = {
  display_name: 'Google Drive (prod)',
  logo: 'https://app.nango.dev/images/template-logos/google-drive.svg',
  provider: 'google-drive',
  unique_key: 'google-drive-prod',
}

describe('integrations DTO mappers (white-label)', () => {
  it('mapProvider: unconfigured catalog entry', () => {
    const dto = mapProvider(vendorProvider, null, false)

    expect(dto).toEqual({
      authMode: 'OAUTH2',
      categories: ['documents', 'storage'],
      configured: false,
      connected: false,
      key: 'google-drive',
      logo: '/api/integrations/logo/google-drive',
      name: 'Google Drive',
    })
    expect(JSON.stringify(dto)).not.toMatch(VENDOR_PATTERN)
  })

  it('mapProvider: configured integration wins the key and name', () => {
    const dto = mapProvider(vendorProvider, vendorIntegration, true)

    expect(dto.key).toBe('google-drive-prod')
    expect(dto.name).toBe('Google Drive (prod)')
    expect(dto.configured).toBe(true)
    expect(dto.connected).toBe(true)
    // logo resolves via our same-origin proxy, keyed by the provider name
    expect(dto.logo).toBe('/api/integrations/logo/google-drive')
    expect(JSON.stringify(dto)).not.toMatch(VENDOR_PATTERN)
  })

  it('mapProvider: custom integration without a catalog provider', () => {
    const dto = mapProvider(null, vendorIntegration, false)

    expect(dto.key).toBe('google-drive-prod')
    expect(dto.authMode).toBe('UNKNOWN')
    expect(dto.categories).toEqual([])
    expect(dto.configured).toBe(true)
    expect(JSON.stringify(dto)).not.toMatch(VENDOR_PATTERN)
  })

  it('mapConnection: exposes only the contract fields, never internal meta', () => {
    const doc: IntegrationDoc = {
      id: 7,
      authMode: 'OAUTH2',
      connectionId: 'conn-uuid-1',
      createdAt: '2026-07-13T10:00:00.000Z',
      displayName: 'Google Drive',
      integrationKey: 'google-drive-prod',
      lastSyncedAt: '2026-07-13T11:00:00.000Z',
      logoUrl: '/api/integrations/logo/google-drive',
      // vendor bookkeeping that must NOT leak into the DTO
      meta: { endUserId: '42', from: 'nango', raw: 'https://api.nango.dev' },
      provider: 'google-drive',
      status: 'connected',
      syncCursor: '{"Document":"abc"}',
      tenant: 3,
      updatedAt: '2026-07-13T11:00:00.000Z',
    }

    const dto = mapConnection(doc)

    expect(dto).toEqual({
      createdAt: '2026-07-13T10:00:00.000Z',
      id: 7,
      integration: 'google-drive-prod',
      lastSyncedAt: '2026-07-13T11:00:00.000Z',
      logo: '/api/integrations/logo/google-drive',
      name: 'Google Drive',
      status: 'connected',
    })
    expect(JSON.stringify(dto)).not.toMatch(VENDOR_PATTERN)
  })

  it('mapConnection: falls back to defaults for sparse docs', () => {
    const dto = mapConnection({
      id: 'a1',
      connectionId: 'conn-2',
      createdAt: '2026-07-13T10:00:00.000Z',
      integrationKey: 'notion',
    })
    expect(dto.name).toBe('notion')
    expect(dto.logo).toBe('/api/integrations/logo/notion')
    expect(dto.status).toBe('connected')
    expect(dto.lastSyncedAt).toBeNull()
    expect(JSON.stringify(dto)).not.toMatch(VENDOR_PATTERN)
  })

  it('mapRecordData: strips vendor metadata, re-keys id as externalId', () => {
    const record: { id: string } & Record<string, unknown> = {
      id: 'rec_123',
      _nango_metadata: {
        cursor: 'cur_1',
        deleted_at: null,
        first_seen_at: '2026-07-01T00:00:00Z',
        last_action: 'ADDED',
        last_modified_at: '2026-07-13T00:00:00Z',
        pruned_at: null,
      },
      body: 'Quarterly report contents',
      title: 'Q2 report',
    }

    const data = mapRecordData(record)

    expect(data.externalId).toBe('rec_123')
    expect(data.title).toBe('Q2 report')
    expect(data.body).toBe('Quarterly report contents')
    expect('id' in data).toBe(false)
    expect('_nango_metadata' in data).toBe(false)
    expect(JSON.stringify(data)).not.toMatch(VENDOR_PATTERN)
  })

  it('deriveRecordTitle: picks the first human field, falls back to model+id', () => {
    expect(deriveRecordTitle({ id: 1, name: '  Alice  ' }, 'Contact')).toBe('Alice')
    expect(deriveRecordTitle({ id: 1, title: 'Doc A' }, 'Document')).toBe('Doc A')
    expect(deriveRecordTitle({ id: 'x9', flag: true }, 'Ticket')).toBe('Ticket x9')
  })

  it('integrationLogoPath encodes unsafe keys', () => {
    expect(integrationLogoPath('google drive/2')).toBe(
      '/api/integrations/logo/google%20drive%2F2',
    )
  })
})

describe('webhook signature verification (raw body HMAC)', () => {
  const signingKey = 'test-signing-key-123'
  const client = new Nango({ secretKey: 'test-secret-key', webhookSigningKey: signingKey })
  const rawBody = JSON.stringify({
    connectionId: 'conn-1',
    operation: 'creation',
    providerConfigKey: 'google-drive-prod',
    success: true,
    type: 'auth',
  })
  const validSignature = createHmac('sha256', signingKey).update(rawBody).digest('hex')

  it('accepts a valid HMAC-SHA256 signature over the raw body', () => {
    expect(
      client.verifyIncomingWebhookRequest(rawBody, { 'x-nango-hmac-sha256': validSignature }),
    ).toBe(true)
  })

  it('reads the signature header case-insensitively', () => {
    expect(
      client.verifyIncomingWebhookRequest(rawBody, { 'X-Nango-Hmac-Sha256': validSignature }),
    ).toBe(true)
  })

  it('rejects a tampered body', () => {
    expect(
      client.verifyIncomingWebhookRequest(rawBody + ' ', {
        'x-nango-hmac-sha256': validSignature,
      }),
    ).toBe(false)
  })

  it('rejects a signature made with the wrong key', () => {
    const forged = createHmac('sha256', 'attacker-key').update(rawBody).digest('hex')
    expect(client.verifyIncomingWebhookRequest(rawBody, { 'x-nango-hmac-sha256': forged })).toBe(
      false,
    )
  })

  it('rejects when the signature header is missing', () => {
    expect(client.verifyIncomingWebhookRequest(rawBody, {})).toBe(false)
  })

  it('rejects the legacy length-extension-vulnerable signature scheme', () => {
    // old scheme: hex(sha256(signingKey + body)) — must NOT verify anymore
    const legacy = createHash('sha256').update(`${signingKey}${rawBody}`).digest('hex')
    expect(client.verifyIncomingWebhookRequest(rawBody, { 'x-nango-hmac-sha256': legacy })).toBe(
      false,
    )
  })
})

describe('provider catalog TTL cache', () => {
  it('serves within the TTL and expires after it', () => {
    let now = 1_000
    const cache = createTtlCache<string[]>(60_000, () => now)

    expect(cache.get()).toBeUndefined()

    cache.set(['a', 'b'])
    expect(cache.get()).toEqual(['a', 'b'])

    now += 59_999
    expect(cache.get()).toEqual(['a', 'b'])

    now += 1 // exactly at TTL — expired
    expect(cache.get()).toBeUndefined()

    cache.set(['c'])
    expect(cache.get()).toEqual(['c'])

    cache.clear()
    expect(cache.get()).toBeUndefined()
  })
})

describe('cursor + id helpers', () => {
  it('parseCursorMap tolerates null, garbage and non-string values', () => {
    expect(parseCursorMap(null)).toEqual({})
    expect(parseCursorMap(undefined)).toEqual({})
    expect(parseCursorMap('not-json')).toEqual({})
    expect(parseCursorMap('[1,2]')).toEqual({})
    expect(parseCursorMap('{"Document":"cur_1","bad":42}')).toEqual({ Document: 'cur_1' })
  })

  it('coerceIdValue converts numeric strings only', () => {
    expect(coerceIdValue('42')).toBe(42)
    expect(coerceIdValue('abc-1')).toBe('abc-1')
  })

  it('extractRelationID handles ids, populated docs and null', () => {
    expect(extractRelationID(5)).toBe(5)
    expect(extractRelationID('t1')).toBe('t1')
    expect(extractRelationID({ id: 9 })).toBe(9)
    expect(extractRelationID(null)).toBeNull()
    expect(extractRelationID(undefined)).toBeNull()
  })
})

describe('Airbyte REST proxy helpers', () => {
  it('normalizes base URLs without changing the public API version path', () => {
    expect(normalizeAirbyteBaseUrl('https://api.airbyte.com/v1/')).toBe(
      'https://api.airbyte.com/v1',
    )
    expect(normalizeAirbyteBaseUrl('https://airbyte.example.com/api/public/v1///')).toBe(
      'https://airbyte.example.com/api/public/v1',
    )
  })

  it('redacts vendor URLs and secrets from proxied responses', () => {
    const sanitized = sanitizeAirbytePayload({
      connections: [
        {
          apiToken: 'airbyte-token',
          connectionId: 'conn-1',
          logUrl: 'https://api.airbyte.com/jobs/1/logs',
          nested: { password: 'pw', sourceUri: 'https://internal.example/source' },
          status: 'running',
        },
      ],
    })

    expect(sanitized).toEqual({
      connections: [
        {
          apiToken: '[redacted]',
          connectionId: 'conn-1',
          logUrl: '[redacted-url]',
          nested: { password: '[redacted]', sourceUri: '[redacted-url]' },
          status: 'running',
        },
      ],
    })
    expect(JSON.stringify(sanitized)).not.toMatch(/airbyte\.com|airbyte-token|internal\.example|pw/)
  })
})

describe('ingest task bypasses document validation on the system path', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Minimal structural shapes for the stub Local API — no `any` at the boundary.
  type FindArgs = { collection: string; where?: Record<string, unknown> }
  type WriteArgs = {
    collection: string
    context?: Record<string, unknown>
    data?: Record<string, unknown>
    id?: number | string
  }
  type NangoRecordLike = { _nango_metadata?: { cursor?: string; last_action?: string }; id: string } & Record<
    string,
    unknown
  >
  type ListRecordsResult = Awaited<ReturnType<Nango['listRecords']>>

  it('creates AND updates documents with context.skipDocumentValidation', async () => {
    // One ADDED record that will be created, one ADDED record that already
    // exists (updated), one DELETED record (deleted). Single page, no cursor.
    const records: NangoRecordLike[] = [
      { _nango_metadata: { cursor: 'c1', last_action: 'ADDED' }, id: 'rec-new', title: 'Fresh' },
      { _nango_metadata: { cursor: 'c2', last_action: 'ADDED' }, id: 'rec-old', title: 'Existing' },
      { _nango_metadata: { cursor: 'c3', last_action: 'DELETED' }, id: 'rec-gone', title: 'Gone' },
    ]
    const listRecords = vi.spyOn(Nango.prototype, 'listRecords').mockResolvedValue({
      next_cursor: null,
      records,
    } as unknown as ListRecordsResult)

    const definitionCreates: WriteArgs[] = []
    const documentCreates: WriteArgs[] = []
    const documentUpdates: WriteArgs[] = []
    const documentDeletes: FindArgs[] = []
    const integrationUpdates: WriteArgs[] = []
    let documentFindCount = 0

    const payload = {
      create: async (args: WriteArgs) => {
        if (args.collection === 'documents') documentCreates.push(args)
        if (args.collection === 'collection-definitions') {
          definitionCreates.push(args)
          return { id: 99 }
        }
        return { id: 1000 }
      },
      delete: async (args: FindArgs) => {
        if (args.collection === 'documents') documentDeletes.push(args)
        return {}
      },
      find: async (args: FindArgs) => {
        if (args.collection === 'integrations') {
          const integrationDoc: IntegrationDoc = {
            id: 1,
            connectionId: 'conn-1',
            createdAt: '2026-07-13T00:00:00.000Z',
            displayName: 'Google Drive',
            integrationKey: 'gdrive',
            syncCursor: null,
            tenant: 5,
          }
          return { docs: [integrationDoc], totalDocs: 1 }
        }
        if (args.collection === 'collection-definitions') {
          return { docs: [], totalDocs: 0 } // force definition create
        }
        if (args.collection === 'documents') {
          documentFindCount += 1
          // first ADDED record is new, second already exists
          return documentFindCount === 1
            ? { docs: [], totalDocs: 0 }
            : { docs: [{ id: 500 }], totalDocs: 1 }
        }
        return { docs: [], totalDocs: 0 }
      },
      logger: { error: () => {}, info: () => {}, warn: () => {} },
      update: async (args: WriteArgs) => {
        if (args.collection === 'documents') documentUpdates.push(args)
        if (args.collection === 'integrations') integrationUpdates.push(args)
        return { id: args.id }
      },
    }

    const req = { payload } as unknown as PayloadRequest
    const task = createIngestIntegrationRecordsTask({
      host: 'https://connect.example.com',
      secretKey: 'test-secret',
    })
    const run = task.handler as unknown as (a: {
      input: IngestIntegrationRecordsInput
      req: PayloadRequest
    }) => Promise<{ output: { deleted: number; processed: number; upserted: number } }>

    const result = await run({
      input: {
        connectionId: 'conn-1',
        model: 'Document',
        providerConfigKey: 'gdrive-prod',
        syncVariant: 'shared-drive',
      },
      req,
    })

    expect(result.output).toEqual({ deleted: 1, processed: 3, upserted: 2 })

    // The core fix: every document write bypasses the beforeValidate validator,
    // which would otherwise reject all keys (auto-created definition has fields:[]).
    expect(documentCreates).toHaveLength(1)
    expect(documentCreates[0].context).toEqual({ skipDocumentValidation: true })
    expect(documentUpdates).toHaveLength(1)
    expect(documentUpdates[0].context).toEqual({ skipDocumentValidation: true })
    expect(documentDeletes).toHaveLength(1)

    // Idempotent upsert wiring: create carries the tenant + externalId
    expect(documentCreates[0].data?.tenant).toBe(5)
    expect((documentCreates[0].data?.data as { externalId?: string }).externalId).toBe('rec-new')

    expect(listRecords).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'Document', variant: 'shared-drive' }),
    )
    expect(definitionCreates[0].data?.slug).toBe('integration_gdrive_document_shared_drive')
    expect(integrationUpdates[0].data?.syncCursor).toBe('{"Document::shared-drive":"c3"}')
  })
})

describe('bounded entitlements cache (eviction + expiry)', () => {
  it('expires entries after the TTL and prunes them on read', () => {
    let now = 1_000
    const cache = createBoundedTtlCache<number>(60_000, 100, () => now)

    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)

    now += 59_999
    expect(cache.get('a')).toBe(1) // still within TTL

    now += 1 // exactly at TTL — expired
    expect(cache.get('a')).toBeUndefined()
    expect(cache.size()).toBe(0) // expired entry pruned on read
  })

  it('caches empty entitlement records (an empty object is a real hit)', () => {
    const cache = createBoundedTtlCache<Record<string, unknown>>(60_000, 100)
    cache.set('t', {})
    expect(cache.get('t')).toEqual({})
  })

  it('evicts the oldest entry when the max size is exceeded', () => {
    const now = 0
    const cache = createBoundedTtlCache<number>(60_000, 3, () => now)

    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.size()).toBe(3)

    cache.set('d', 4) // over cap -> evict least-recently-used ('a')
    expect(cache.size()).toBe(3)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
    expect(cache.get('d')).toBe(4)
  })

  it('recency bump on read protects a freshly-read key from eviction', () => {
    const now = 0
    const cache = createBoundedTtlCache<number>(60_000, 3, () => now)

    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.get('a')).toBe(1) // 'a' becomes most-recent; 'b' now oldest

    cache.set('d', 4) // evicts 'b'
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
    expect(cache.get('c')).toBe(3)
    expect(cache.get('d')).toBe(4)
  })

  it('prunes expired entries before evicting a live one on overflow', () => {
    let now = 0
    const cache = createBoundedTtlCache<number>(1_000, 2, () => now)

    cache.set('a', 1) // expires at 1000
    now = 500
    cache.set('b', 2) // expires at 1500
    now = 1_200 // 'a' expired, 'b' still live
    cache.set('c', 3) // size 3 > 2 -> prune expired 'a', keep 'b' + 'c'

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })
})

describe.skipIf(!process.env.NANGO_SECRET_KEY)('live vendor catalog', () => {
  const liveClient = () =>
    new Nango({
      host: process.env.NANGO_HOST,
      secretKey: process.env.NANGO_SECRET_KEY as string,
    })

  it('lists the full provider catalog and maps it vendor-free', async () => {
    const { data } = await liveClient().listProviders({})
    expect(data.length).toBeGreaterThan(100)

    const dto = mapProvider(data[0], null, false)
    expect(typeof dto.key).toBe('string')
    expect(dto.logo.startsWith('/api/integrations/logo/')).toBe(true)
    expect(JSON.stringify(dto)).not.toMatch(VENDOR_PATTERN)
  })

  it('lists configured integrations and maps them vendor-free', async () => {
    const { configs } = await liveClient().listIntegrations()
    expect(Array.isArray(configs)).toBe(true)

    for (const config of configs) {
      const dto = mapProvider(null, config, false)
      expect(dto.configured).toBe(true)
      expect(JSON.stringify(dto)).not.toMatch(VENDOR_PATTERN)
    }
  })
})
