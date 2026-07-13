<?php
declare(strict_types=1);
namespace AACSearch\SDK\Analytics;
use AACSearch\SDK\ApiCall;

class AnalyticsEvents {
    public function __construct(private readonly ApiCall $apiCall) {}
    /** @param array{type:string, body:array} $event */
    public function send(array $event): array { return $this->apiCall->post('/analytics/events', $event); }
}
