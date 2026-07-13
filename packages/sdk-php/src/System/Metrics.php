<?php
declare(strict_types=1);
namespace AACSearch\SDK\System;
use AACSearch\SDK\ApiCall;

class Metrics {
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @return array<string,string> */
    public function retrieve(): array { return $this->apiCall->get('/metrics.json'); }
}
