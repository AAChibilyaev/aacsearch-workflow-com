<?php
declare(strict_types=1);
namespace AACSearch\SDK\Keys;
use AACSearch\SDK\ApiCall;

class Keys {
    private const RESOURCEPATH = '/keys';
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{description:string, actions:string[], collections:string[], expires_at?:int} $schema */
    public function create(array $schema): array { return $this->apiCall->post(self::RESOURCEPATH, $schema); }
    /** @return array{keys: array<int, array<string,mixed>>} */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH); }
    /** @param array<string,mixed> $params */
    public function generateScopedSearchKey(string $searchKey, array $params): string {
        return $this->apiCall->post(self::RESOURCEPATH . '/scoped', ['search_key' => $searchKey, ...$params]);
    }
}
