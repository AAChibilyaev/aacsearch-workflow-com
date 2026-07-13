<?php
declare(strict_types=1);
namespace AACSearch\SDK\Aliases;
use AACSearch\SDK\ApiCall;
class Alias { public function __construct(private readonly string $n,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/aliases/'.urlencode($this->n));} public function delete():array{return $this->a->delete('/aliases/'.urlencode($this->n));} }
