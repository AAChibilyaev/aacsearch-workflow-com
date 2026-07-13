// @vitest-environment node
import { createHash, createHmac } from 'node:crypto'

import { Nango } from '@nangohq/node'
import { describe, expect, it } from 'vitest'

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
