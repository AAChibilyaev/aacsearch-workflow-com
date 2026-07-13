<?php
declare(strict_types=1);
namespace AACSearch\SDK\System;
use AACSearch\SDK\ApiCall;

class Operations {
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @return array{success: bool} */
    public function perform(string $action = 'snapshot'): array {
        return $this->apiCall->post('/operations/' . $action);
    }
}
