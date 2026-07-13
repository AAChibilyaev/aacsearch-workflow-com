<?php
declare(strict_types=1);
namespace AACSearch\SDK\Synonyms;
use AACSearch\SDK\ApiCall;

class SynonymSetItems {
    public function __construct(private readonly string $synonymSetId, private readonly ApiCall $apiCall) {}
    /** @param array{synonyms: string[], locale?: string} $params */
    public function create(array $params): array {
        return $this->apiCall->post('/synonyms/' . urlencode($this->synonymSetId) . '/items', $params);
    }
    /** @return array{synonyms: array<int, array<string,mixed>>} */
    public function retrieve(): array { return $this->apiCall->get('/synonyms/' . urlencode($this->synonymSetId) . '/items'); }
}
