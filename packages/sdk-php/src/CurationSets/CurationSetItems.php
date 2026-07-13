<?php
declare(strict_types=1);
namespace AACSearch\SDK\CurationSets;
use AACSearch\SDK\ApiCall;
class CurationSetItems { public function __construct(private readonly string $c,private readonly string $sid,private readonly ApiCall $a){} public function create(array $p):array{return $this->a->post('/curations/'.urlencode($this->c).'/curations/'.urlencode($this->sid).'/items',$p);} public function retrieve():array{return $this->a->get('/curations/'.urlencode($this->c).'/curations/'.urlencode($this->sid).'/items');} }
