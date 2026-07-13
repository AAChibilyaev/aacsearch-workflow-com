<?php
declare(strict_types=1);
namespace AACSearch\SDK\Stopwords;
use AACSearch\SDK\ApiCall;

class Stopword {
    public function __construct(private readonly string $id, private readonly ApiCall $apiCall) {}
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get(Stopwords::RESOURCEPATH . '/' . urlencode($this->id)); }
    /** @return array{id: string} */
    public function delete(): array { return $this->apiCall->delete(Stopwords::RESOURCEPATH . '/' . urlencode($this->id)); }
}
