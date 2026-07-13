<?php

declare(strict_types=1);

namespace AACSearch\SDK;

/**
 * Search API (PayloadCMS search gateway — /api/v1/*).
 *
 * Tenant isolation is automatic: the API key is tenant-scoped.
 * Scoped keys embed the tenant filter HMAC — the client can't strip it.
 *
 * @link src/plugins/searchGateway.ts
 */
class Search
{
    public function __construct(private readonly ApiCall $api) {}

    /**
     * Multi-search across collections.
     *
     * @param array{searches: array<int, array{collection:string, q:string, query_by:string, filter_by?:string, ...}>} $request
     * @param array<string,mixed> $commonParams
     * @return array{results: array<int, array{found:int, hits:array, facet_counts:array}>}
     */
    public function multiSearch(array $request, array $commonParams = []): array
    {
        return $this->api->post('/v1/multi_search', $request, $commonParams);
    }

    /**
     * Issue a scoped API key with embedded tenant/locale filter.
     *
     * @return array{scopedKey: string, expiresAt: string}
     */
    public function scopedKey(string $tenantId, ?string $locale = null, array $extra = []): array
    {
        return $this->api->post('/v1/keys/scoped', array_merge($extra, [
            'tenant' => $tenantId,
            'locale' => $locale,
        ]));
    }

    /** @return array{ok: bool} */
    public function health(): array
    {
        return $this->api->get('/v1/health');
    }
}
