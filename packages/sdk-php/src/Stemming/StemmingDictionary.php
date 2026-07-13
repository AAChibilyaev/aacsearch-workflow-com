<?php
declare(strict_types=1);
namespace AACSearch\SDK\Stemming;
use AACSearch\SDK\ApiCall;
class StemmingDictionary { public function __construct(private readonly string $id,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/stemming/dictionaries/'.urlencode($this->id));} public function delete():array{return $this->a->delete('/stemming/dictionaries/'.urlencode($this->id));} }
