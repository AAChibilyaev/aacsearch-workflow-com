<?php
declare(strict_types=1);
namespace AACSearch\SDK\Presets;
use AACSearch\SDK\ApiCall;
class Presets { public function __construct(private readonly ApiCall $a){} public function upsert(string $n,array $p):array{return $this->a->put('/presets/'.urlencode($n),$p);} public function retrieve():array{return $this->a->get('/presets');} }
