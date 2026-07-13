<?php
declare(strict_types=1);
namespace AACSearch\SDK\System;
use AACSearch\SDK\ApiCall;
class Stats { public function __construct(private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/stats.json');} }
