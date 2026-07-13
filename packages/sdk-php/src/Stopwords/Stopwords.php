<?php
declare(strict_types=1);
namespace AACSearch\SDK\Stopwords;
use AACSearch\SDK\ApiCall;

class Stopwords {
    public const RESOURCEPATH = '/stopwords';
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{stopwords: string[], locale?: string} $params */
    public function upsert(string $stopwordId, array $params): array {
        return $this->apiCall->put(self::RESOURCEPATH . '/' . urlencode($stopwordId), $params);
    }
    /** @return array{stopwords: array<int, array<string,mixed>>} */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH); }
}
