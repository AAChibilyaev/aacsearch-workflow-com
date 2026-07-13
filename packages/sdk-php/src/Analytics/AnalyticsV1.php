<?php
declare(strict_types=1);
namespace AACSearch\SDK\Analytics;
use AACSearch\SDK\ApiCall;
class AnalyticsV1 { public function __construct(private readonly ApiCall $a){} public function sendEvent(array $e):array{return $this->a->post('/analytics/events',$e);} }
