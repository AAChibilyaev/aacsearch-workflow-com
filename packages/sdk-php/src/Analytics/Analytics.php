<?php
declare(strict_types=1);
namespace AACSearch\SDK\Analytics;
use AACSearch\SDK\ApiCall;

class Analytics {
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @return array{rules: array<int, array<string,mixed>>} */
    public function rules(): array { return $this->apiCall->get('/analytics/rules'); }
    /** @param array{name:string, type:string, params:array} $rule */
    public function createRule(array $rule): array { return $this->apiCall->post('/analytics/rules', $rule); }
    /** @return array{name: string} */
    public function deleteRule(string $name): array { return $this->apiCall->delete('/analytics/rules/' . urlencode($name)); }
}

class AnalyticsV1 {
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{type:string, body:array} $event */
    public function sendEvent(array $event): array { return $this->apiCall->post('/analytics/events', $event); }
}
