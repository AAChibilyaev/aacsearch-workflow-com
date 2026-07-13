<?php
declare(strict_types=1);
namespace AACSearch\SDK\Stemming;
use AACSearch\SDK\ApiCall;
class StemmingDictionaries { public function __construct(private readonly ApiCall $a){} public function upsert(string $id,array $p):array{return $this->a->put('/stemming/dictionaries/'.urlencode($id),$p);} public function retrieve():array{return $this->a->get('/stemming/dictionaries');} }
