<?php
declare(strict_types=1);
namespace AACSearch\SDK\Analytics;
use AACSearch\SDK\ApiCall;

class AnalyticsRule {
    public function __construct(private readonly string $name, private readonly ApiCall $apiCall) {}
    /** @return array<string,mixed> */
    public function retrieve(): array { return $this->apiCall->get('/analytics/rules/' . urlencode($this->name)); }
    /** @return array{name: string} */
    public function delete(): array { return $this->apiCall->delete('/analytics/rules/' . urlencode($this->name)); }
}
