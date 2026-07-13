<?php
declare(strict_types=1);
namespace AACSearch\SDK\CurationSets;
use AACSearch\SDK\ApiCall;

class CurationSets {
    public const RESOURCEPATH = '/curations';
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{rule:array{match:string,query:string}, includes?:array, excludes?:array} $params */
    public function create(string $collection, array $params): array {
        return $this->apiCall->post(self::RESOURCEPATH . '/' . urlencode($collection) . '/curations', $params);
    }
    /** @return array{curations: array<int, array<string,mixed>>} */
    public function retrieve(string $collection): array {
        return $this->apiCall->get(self::RESOURCEPATH . '/' . urlencode($collection) . '/curations');
    }
}
