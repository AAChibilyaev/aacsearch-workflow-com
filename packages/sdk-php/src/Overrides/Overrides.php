<?php
declare(strict_types=1);
namespace AACSearch\SDK\Overrides;
use AACSearch\SDK\ApiCall;
class Overrides { public function __construct(private readonly ApiCall $a){} public function upsert(string $c,string $oid,array $s):array{return $this->a->put('/overrides/'.urlencode($c).'/'.urlencode($oid),$s);} public function retrieve(string $c):array{return $this->a->get('/overrides/'.urlencode($c));} }
