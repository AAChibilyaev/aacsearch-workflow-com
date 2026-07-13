<?php
declare(strict_types=1);
namespace AACSearch\SDK\Aliases;
use AACSearch\SDK\ApiCall;
class Aliases { public function __construct(private readonly ApiCall $a){} public function upsert(string $n,array $m):array{return $this->a->put('/aliases/'.urlencode($n),$m);} public function retrieve():array{return $this->a->get('/aliases');} }
