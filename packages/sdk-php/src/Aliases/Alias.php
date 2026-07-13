<?php
declare(strict_types=1);
namespace AACSearch\SDK\Aliases;
use AACSearch\SDK\ApiCall;

class Alias {
    public function __construct(private readonly string $name, private readonly ApiCall $apiCall) {}
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get(Aliases::RESOURCEPATH . '/' . urlencode($this->name)); }
    /** @return array<string,mixed> */
    public function delete(): array { return $this->apiCall->delete(Aliases::RESOURCEPATH . '/' . urlencode($this->name)); }
}
