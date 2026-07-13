<?php

declare(strict_types=1);

namespace AACSearch\SDK;

class MultiSearch
{
    public function __construct(
        private readonly ApiCall $apiCall,
        private readonly Configuration $configuration,
    ) {}

    public function clearCache(): void
    {
        // No-op
    }

    /**
     * @param array{searches: array<int, array<string,mixed>>, union?: bool} $searchRequests
     * @param array<string,mixed> $commonParams
     * @return array{results: array<int, array<string,mixed>>}
     */
    public function perform(array $searchRequests, array $commonParams = []): array
    {
        return $this->apiCall->post('/multi_search', $searchRequests, $commonParams);
    }
}
