<?php
declare(strict_types=1);
namespace AACSearch\SDK\Presets;
use AACSearch\SDK\ApiCall;

class Preset {
    private const RESOURCEPATH = '/presets';
    public function __construct(private readonly string $name, private readonly ApiCall $apiCall) {}
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH . '/' . urlencode($this->name)); }
    /** @return array<string,mixed> */
    public function delete(): array { return $this->apiCall->delete(self::RESOURCEPATH . '/' . urlencode($this->name)); }
}
