<?php
declare(strict_types=1);
namespace AACSearch\SDK\Presets;
use AACSearch\SDK\ApiCall;
class Preset { public function __construct(private readonly string $n,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/presets/'.urlencode($this->n));} public function delete():array{return $this->a->delete('/presets/'.urlencode($this->n));} }
