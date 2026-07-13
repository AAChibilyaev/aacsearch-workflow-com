<?php
declare(strict_types=1);
namespace AACSearch\SDK\CurationSets;
use AACSearch\SDK\ApiCall;
class CurationSets { public function __construct(private readonly ApiCall $a){} public function create(string $c,array $p):array{return $this->a->post('/curations/'.urlencode($c).'/curations',$p);} public function retrieve(string $c):array{return $this->a->get('/curations/'.urlencode($c).'/curations');} }
