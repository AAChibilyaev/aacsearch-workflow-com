<?php
declare(strict_types=1);
namespace AACSearch\SDK\System;
use AACSearch\SDK\ApiCall;

class Debug {
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get('/debug'); }
}
