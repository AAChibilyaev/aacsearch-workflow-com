<?php
declare(strict_types=1);
namespace AACSearch\SDK\Aliases;
use AACSearch\SDK\ApiCall;

class Aliases {
    public const RESOURCEPATH = '/aliases';
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{collection_name: string} $mapping */
    public function upsert(string $name, array $mapping): array {
        return $this->apiCall->put(self::RESOURCEPATH . '/' . urlencode($name), $mapping);
    }
    /** @return array{aliases: array<int, array<string,mixed>>} */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH); }
}
