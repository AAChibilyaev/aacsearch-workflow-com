<?php
declare(strict_types=1);
namespace AACSearch\SDK;
class MultiSearch {
    public function __construct(private readonly ApiCall $api) {}
    public function perform(array $req, array $common = []): array { return $this->api->post('/multi_search', $req, $common); }
}
