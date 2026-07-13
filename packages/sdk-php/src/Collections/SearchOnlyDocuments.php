<?php

declare(strict_types=1);

namespace AACSearch\SDK\Collections;

use AACSearch\SDK\ApiCall;
use AACSearch\SDK\Configuration;
use AACSearch\SDK\RequestWithCache;

class SearchOnlyDocuments
{
    protected readonly RequestWithCache $requestWithCache;

    public function __construct(
        protected readonly string $collectionName,
        protected readonly ApiCall $apiCall,
        protected readonly Configuration $configuration,
    ) {
        $this->requestWithCache = new RequestWithCache();
    }

    public function clearCache(): void
    {
        $this->requestWithCache->clearCache();
    }

    /**
     * @param array<string,mixed> $params
     * @param array{cacheSearchResultsForSeconds?: int} $options
     * @return array<string,mixed>
     */
    public function search(array $params, array $options = []): array
    {
        $path = '/collections/' . urlencode($this->collectionName) . '/documents/search';

        if (isset($options['cacheSearchResultsForSeconds'])) {
            return $this->requestWithCache->perform(
                $this->apiCall,
                'get',
                ['path' => $path, 'queryParams' => $params],
                ['cacheResponseForSeconds' => $options['cacheSearchResultsForSeconds']],
            );
        }

        return $this->apiCall->get($path, $params);
    }

    protected function endpointPath(): string
    {
        return '/collections/' . urlencode($this->collectionName) . '/documents';
    }
}
