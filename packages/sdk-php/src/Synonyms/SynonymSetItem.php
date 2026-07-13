<?php
declare(strict_types=1);
namespace AACSearch\SDK\Synonyms;
use AACSearch\SDK\ApiCall;

class SynonymSetItem {
    public function __construct(
        private readonly string $synonymSetId,
        private readonly string $itemId,
        private readonly ApiCall $apiCall,
    ) {}
    /** @return array<string,mixed> */
    public function retrieve(): array {
        return $this->apiCall->get('/synonyms/' . urlencode($this->synonymSetId) . '/items/' . urlencode($this->itemId));
    }
    /** @return array{id: string} */
    public function delete(): array {
        return $this->apiCall->delete('/synonyms/' . urlencode($this->synonymSetId) . '/items/' . urlencode($this->itemId));
    }
}
