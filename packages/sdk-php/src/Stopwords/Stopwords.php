<?php
declare(strict_types=1);
namespace AACSearch\SDK\Stopwords;
use AACSearch\SDK\ApiCall;
class Stopwords { public function __construct(private readonly ApiCall $a){} public function upsert(string $id,array $p):array{return $this->a->put('/stopwords/'.urlencode($id),$p);} public function retrieve():array{return $this->a->get('/stopwords');} }
