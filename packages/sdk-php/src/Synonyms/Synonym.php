<?php
declare(strict_types=1);
namespace AACSearch\SDK\Synonyms;
use AACSearch\SDK\ApiCall;
class Synonym { public function __construct(private readonly string $c,private readonly string $id,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/synonyms/'.urlencode($this->c).'/synonyms/'.urlencode($this->id));} public function delete():array{return $this->a->delete('/synonyms/'.urlencode($this->c).'/synonyms/'.urlencode($this->id));} }
