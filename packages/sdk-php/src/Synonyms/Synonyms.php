<?php
declare(strict_types=1);
namespace AACSearch\SDK\Synonyms;
use AACSearch\SDK\ApiCall;
class Synonyms { public function __construct(private readonly ApiCall $a){} public function create(array $s):array{return $this->a->post('/synonyms',$s);} public function retrieve():array{return $this->a->get('/synonyms');} }
