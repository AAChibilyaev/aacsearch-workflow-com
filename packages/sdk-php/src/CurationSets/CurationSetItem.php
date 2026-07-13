<?php
declare(strict_types=1);
namespace AACSearch\SDK\CurationSets;
use AACSearch\SDK\ApiCall;

class CurationSetItem {
    public function __construct(
        private readonly string $collection,
        private readonly string $curationSetId,
        private readonly string $itemId,
        private readonly ApiCall $apiCall,
    ) {}
    /** @return array<string,mixed> */
    public function retrieve(): array {
        return $this->apiCall->get($this->endpointPath() . '/' . urlencode($this->itemId));
    }
    /** @return array{id: string} */
    public function delete(): array {
        return $this->apiCall->delete($this->endpointPath() . '/' . urlencode($this->itemId));
    }
    private function endpointPath(): string {
        return '/curations/' . urlencode($this->collection) . '/curations/' . urlencode($this->curationSetId) . '/items';
    }
}
