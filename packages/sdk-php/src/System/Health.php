<?php
declare(strict_types=1);
namespace AACSearch\SDK\System;
use AACSearch\SDK\ApiCall;

class Health {
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @return array{ok: bool} */
    public function retrieve(): array { return $this->apiCall->get('/health'); }
}
