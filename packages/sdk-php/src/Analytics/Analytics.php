<?php
declare(strict_types=1);
namespace AACSearch\SDK\Analytics;
use AACSearch\SDK\ApiCall;
class Analytics { public function __construct(private readonly ApiCall $a){} public function rules():array{return $this->a->get('/analytics/rules');} public function createRule(array $r):array{return $this->a->post('/analytics/rules',$r);} public function deleteRule(string $n):array{return $this->a->delete('/analytics/rules/'.urlencode($n));} }
