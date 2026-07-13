<?php
declare(strict_types=1);
namespace AACSearch\SDK\Presets;
use AACSearch\SDK\ApiCall;

class Presets {
    private const RESOURCEPATH = '/presets';
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array<string,mixed> $params */
    public function upsert(string $presetName, array $params): array {
        return $this->apiCall->put(self::RESOURCEPATH . '/' . urlencode($presetName), $params);
    }
    /** @return array{presets: array<int, array<string,mixed>>} */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH); }
}
