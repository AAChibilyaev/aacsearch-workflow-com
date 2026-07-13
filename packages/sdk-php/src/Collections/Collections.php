<?php
declare(strict_types=1);
namespace AACSearch\SDK\Collections;
use AACSearch\SDK\ApiCall;
class Collections {
    public function __construct(private readonly ApiCall $api) {}
    public function create(array $schema): array { return $this->api->post('/collections', $schema); }
    public function retrieve(): array { return $this->api->get('/collections'); }
    /** @deprecated use SDK\Collections */ 
    public function createOld(array $s): array { return $this->create($s); }
}
