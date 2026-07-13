<?php
declare(strict_types=1);
namespace AACSearch\SDK\Keys;
use AACSearch\SDK\ApiCall;
class Key { public function __construct(private readonly int $id,private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/keys/'.$this->id);} public function delete():array{return $this->a->delete('/keys/'.$this->id);} }
