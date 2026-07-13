<?php
declare(strict_types=1);
namespace AACSearch\SDK\Analytics;
use AACSearch\SDK\ApiCall;
class AnalyticsRule { public function __construct(private readonly string $n,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/analytics/rules/'.urlencode($this->n));} public function delete():array{return $this->a->delete('/analytics/rules/'.urlencode($this->n));} }
