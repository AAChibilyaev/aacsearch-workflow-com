<?php
declare(strict_types=1);
namespace AACSearch\SDK\CurationSets;
use AACSearch\SDK\ApiCall;

class CurationSetItems {
    public function __construct(
        private readonly string $collection,
        private readonly string $curationSetId,
        private readonly ApiCall $apiCall,
    ) {}
    /** @param array{id: string, position: int} $params */
    public function create(array $params): array {
        return $this->apiCall->post(
            '/curations/' . urlencode($this->collection) . '/curations/' . urlencode($this->curationSetId) . '/items',
            $params,
        );
    }
    /** @return array{items: array<int, array<string,mixed>>} */
    public function retrieve(): array {
        return $this->apiCall->get(
            '/curations/' . urlencode($this->collection) . '/curations/' . urlencode($this->curationSetId) . '/items',
        );
    }
}
