<?php
declare(strict_types=1);
namespace AACSearch\SDK\Synonyms;
use AACSearch\SDK\ApiCall;
class SynonymSetItems { public function __construct(private readonly string $sid,private readonly ApiCall $a){} public function create(array $p):array{return $this->a->post('/synonyms/'.urlencode($this->sid).'/items',$p);} public function retrieve():array{return $this->a->get('/synonyms/'.urlencode($this->sid).'/items');} }
