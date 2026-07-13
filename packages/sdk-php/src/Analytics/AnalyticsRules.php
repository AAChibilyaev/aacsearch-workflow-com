<?php
declare(strict_types=1);
namespace AACSearch\SDK\Analytics;
use AACSearch\SDK\ApiCall;
class AnalyticsRules { public function __construct(private readonly ApiCall $a){} public function upsert(array $r):array{return $this->a->put('/analytics/rules/'.urlencode($r['name']),$r);} public function retrieve():array{return $this->a->get('/analytics/rules');} }
