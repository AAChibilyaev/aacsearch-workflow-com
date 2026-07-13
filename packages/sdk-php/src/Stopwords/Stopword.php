<?php
declare(strict_types=1);
namespace AACSearch\SDK\Stopwords;
use AACSearch\SDK\ApiCall;
class Stopword { public function __construct(private readonly string $id,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/stopwords/'.urlencode($this->id));} public function delete():array{return $this->a->delete('/stopwords/'.urlencode($this->id));} }
