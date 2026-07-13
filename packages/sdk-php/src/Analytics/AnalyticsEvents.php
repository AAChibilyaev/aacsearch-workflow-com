<?php
declare(strict_types=1);
namespace AACSearch\SDK\Analytics;
use AACSearch\SDK\ApiCall;
class AnalyticsEvents { public function __construct(private readonly ApiCall $a){} public function send(array $e):array{return $this->a->post('/analytics/events',$e);} }
