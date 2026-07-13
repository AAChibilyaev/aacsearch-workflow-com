<?php
declare(strict_types=1);
namespace AACSearch\SDK\Synonyms;
use AACSearch\SDK\ApiCall;

class SynonymSet {
    public readonly SynonymSetItems $items;
    /** @var array<string, SynonymSetItem> */
    private array $individualItems = [];
    public function __construct(private readonly string $id, private readonly ApiCall $apiCall) {
        $this->items = new SynonymSetItems($id, $apiCall);
    }
    public function items(?string $itemId = null): SynonymSetItems|SynonymSetItem {
        if ($itemId === null) return $this->items;
        if (!isset($this->individualItems[$itemId])) {
            $this->individualItems[$itemId] = new SynonymSetItem($this->id, $itemId, $this->apiCall);
        }
        return $this->individualItems[$itemId];
    }
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get('/synonyms/' . urlencode($this->id)); }
    /** @return array{id: string} */
    public function delete(): array { return $this->apiCall->delete('/synonyms/' . urlencode($this->id)); }
}
