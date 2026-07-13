<?php
declare(strict_types=1);
namespace AACSearch\SDK\Stemming;
use AACSearch\SDK\ApiCall;

class StemmingDictionaries {
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{word:string, root:string} $params */
    public function upsert(string $id, array $params): array {
        return $this->apiCall->put(Stemming::RESOURCEPATH . '/dictionaries/' . urlencode($id), $params);
    }
    /** @return array{dictionaries: array<int, array<string,mixed>>} */
    public function retrieve(): array { return $this->apiCall->get(Stemming::RESOURCEPATH . '/dictionaries'); }
}
