<?php
declare(strict_types=1);
namespace AACSearch\SDK\Synonyms;
use AACSearch\SDK\ApiCall;

class Synonym {
    public function __construct(
        private readonly string $collection,
        private readonly string $id,
        private readonly ApiCall $apiCall,
    ) {}
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get($this->endpointPath()); }
    /** @return array{id: string} */
    public function delete(): array { return $this->apiCall->delete($this->endpointPath()); }
    private function endpointPath(): string {
        return '/synonyms/' . urlencode($this->collection) . '/synonyms/' . urlencode($this->id);
    }
}
