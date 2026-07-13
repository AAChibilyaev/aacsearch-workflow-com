<?php
declare(strict_types=1);
namespace AACSearch\SDK\Keys;
use AACSearch\SDK\ApiCall;

class Key {
    private const RESOURCEPATH = '/keys';
    public function __construct(private readonly int $id, private readonly ApiCall $apiCall) {}
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get(self::RESOURCEPATH . '/' . $this->id); }
    /** @return array{id: int} */
    public function delete(): array { return $this->apiCall->delete(self::RESOURCEPATH . '/' . $this->id); }
}
