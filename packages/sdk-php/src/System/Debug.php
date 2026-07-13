<?php
declare(strict_types=1);
namespace AACSearch\SDK\System;
use AACSearch\SDK\ApiCall;
class Debug { public function __construct(private readonly ApiCall $a){} public function retrieve():array{return $this->a->get('/debug');} }
