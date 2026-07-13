<?php
declare(strict_types=1);
namespace AACSearch\SDK\Keys;
use AACSearch\SDK\ApiCall;
class Keys { public function __construct(private readonly ApiCall $a){} public function create(array $s):array{return $this->a->post('/keys',$s);} public function retrieve():array{return $this->a->get('/keys');} }
