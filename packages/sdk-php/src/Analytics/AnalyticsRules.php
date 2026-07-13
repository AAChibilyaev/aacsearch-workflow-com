<?php
declare(strict_types=1);
namespace AACSearch\SDK\Analytics;
use AACSearch\SDK\ApiCall;

class AnalyticsRules {
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{name:string, type:string, params:array} $rule */
    public function upsert(array $rule): array { return $this->apiCall->put('/analytics/rules/' . urlencode($rule['name']), $rule); }
    /** @return array{rules: array<int, array<string,mixed>>} */
    public function retrieve(): array { return $this->apiCall->get('/analytics/rules'); }
}
