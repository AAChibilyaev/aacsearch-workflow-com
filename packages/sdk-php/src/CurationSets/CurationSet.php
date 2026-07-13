<?php
declare(strict_types=1);
namespace AACSearch\SDK\CurationSets;
use AACSearch\SDK\ApiCall;

class CurationSet {
    public readonly CurationSetItems $items;
    /** @var array<string, CurationSetItem> */
    private array $individualItems = [];
    public function __construct(
        private readonly string $collection,
        private readonly string $id,
        private readonly ApiCall $apiCall,
    ) {
        $this->items = new CurationSetItems($collection, $id, $apiCall);
    }
    public function items(?string $itemId = null): CurationSetItems|CurationSetItem {
        if ($itemId === null) return $this->items;
        if (!isset($this->individualItems[$itemId])) {
            $this->individualItems[$itemId] = new CurationSetItem($this->collection, $this->id, $itemId, $this->apiCall);
        }
        return $this->individualItems[$itemId];
    }
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get($this->endpointPath()); }
    /** @return array{id: string} */
    public function delete(): array { return $this->apiCall->delete($this->endpointPath()); }
    private function endpointPath(): string {
        return '/curations/' . urlencode($this->collection) . '/curations/' . urlencode($this->id);
    }
}
