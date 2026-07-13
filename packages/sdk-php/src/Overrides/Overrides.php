<?php
declare(strict_types=1);
namespace AACSearch\SDK\Overrides;
use AACSearch\SDK\ApiCall;

class Overrides {
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{rule:array{match:string,query:string}} $schema */
    public function upsert(string $collection, string $overrideId, array $schema): array {
        return $this->apiCall->put('/overrides/' . urlencode($collection) . '/' . urlencode($overrideId), $schema);
    }
    /** @return array{overrides: array<int, array<string,mixed>>} */
    public function retrieve(string $collection): array {
        return $this->apiCall->get('/overrides/' . urlencode($collection));
    }
}
